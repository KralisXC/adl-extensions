// 本地媒体转换 —— 下载完就地无损封装，不重编码。
//
// 能力来源（都由 manifest 声明、且只在 trusted 模式下放行）：
//   adl.pluginDir()  插件自己的安装目录，ffmpeg 就放在 <pluginDir>/bin/
//   adl.fs.exists()  查输出文件是否重名
//   adl.exec()       调 ffmpeg
//   adl.notify()     结果回执
//
// 设计取舍：只做 `-c copy`。重编码要几分钟、还会掉画质，用户点一下
// "转 MP4"期望的是"改个容器立刻能用"，不是"等一小时重新编码"。
// 容器不兼容（比如 mkv 里的 opus 塞不进 mp4）时 ffmpeg 会报
// `Could not find tag for codec`，这时候如实告诉用户"得重编码才有救"，
// 而不是偷偷降质。

const FFMPEG = "bin/ffmpeg.exe";
const FFMPEG_UNIX = "bin/ffmpeg";

function ffmpegPath() {
  const dir = adl.pluginDir();
  if (!dir) return "";
  const win = dir + "/" + FFMPEG;
  if (adl.fs.exists(win)) return win;
  const nix = dir + "/" + FFMPEG_UNIX;
  if (adl.fs.exists(nix)) return nix;
  return "";
}

// 拆出目录、主名、扩展名。路径可能是 `/` 也可能是 `\`。
function splitPath(p) {
  const sep = p.lastIndexOf("/") >= 0 ? "/" : "\\";
  const slash = p.lastIndexOf(sep);
  const dir = slash >= 0 ? p.slice(0, slash) : "";
  const file = slash >= 0 ? p.slice(slash + 1) : p;
  const dot = file.lastIndexOf(".");
  const stem = dot > 0 ? file.slice(0, dot) : file;
  const ext = dot > 0 ? file.slice(dot + 1) : "";
  return { dir, stem, ext, sep };
}

// 重名就加时间戳，绝不覆盖用户已有的文件。
function pickOutput(p, newExt) {
  const s = splitPath(p);
  const base = s.dir ? s.dir + s.sep + s.stem : s.stem;
  let out = base + "." + newExt;
  if (!adl.fs.exists(out)) return out;
  const stamp = Date.now();
  out = base + "-" + stamp + "." + newExt;
  return out;
}

const VIDEO_EXT = ["mp4", "mkv", "mov", "avi", "webm", "flv", "ts", "m4v", "wmv", "mpg", "mpeg"];
const AUDIO_EXT = ["m4a", "mp3", "aac", "flac", "wav", "ogg", "opus", "wma", "mka"];

function classify(ext) {
  const e = (ext || "").toLowerCase();
  if (VIDEO_EXT.indexOf(e) >= 0) return "video";
  if (AUDIO_EXT.indexOf(e) >= 0) return "audio";
  return "unknown";
}

// 把 ffmpeg 的失败翻成人话。原文太长，用户看不懂 `Conversion failed!`。
function describeFailure(res, out) {
  if (res.timedOut) {
    return "ffmpeg 超时被中止（文件可能过大）。";
  }
  const err = (res.stderr || "") + (res.stdout || "");
  if (/Could not find tag for codec/i.test(err)) {
    return "这个文件的音视频编码塞不进目标容器，无损转换不可行；需要重编码才有救。";
  }
  if (/Invalid data found when processing input/i.test(err)) {
    return "ffmpeg 读不出这个文件，可能下载不完整或格式本身有问题。";
  }
  if (/Permission denied|Access is denied/i.test(err)) {
    return "没有权限写目标目录：" + out;
  }
  const lines = err.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const tail = lines.length ? lines[lines.length - 1].trim() : "";
  return "ffmpeg 退出码 " + res.code + (tail ? "：" + tail : "") ;
}

function convert(kind, input) {
  const ff = ffmpegPath();
  if (!ff) {
    return {
      ok: false,
      message: "插件目录里找不到 ffmpeg。请把 ffmpeg 放到插件目录下的 bin/ 里。",
    };
  }

  const s = splitPath(input);
  const cls = classify(s.ext);
  let args;
  let newExt;

  if (kind === "to-mp4") {
    if (cls === "audio") {
      // 纯音频塞 mp4 没意义，改用 m4a 封装。
      newExt = "m4a";
      args = ["-y", "-i", input, "-vn", "-c:a", "copy", "-movflags", "+faststart"];
    } else {
      newExt = "mp4";
      args = ["-y", "-i", input, "-c", "copy", "-movflags", "+faststart"];
    }
  } else if (kind === "extract-audio") {
    if (cls === "unknown") {
      return { ok: false, message: "认不出这个文件的类型，不敢乱猜音轨在哪。" };
    }
    newExt = "m4a";
    args = ["-y", "-i", input, "-vn", "-c:a", "copy"];
  } else {
    return { ok: false, message: "未知动作：" + kind };
  }

  const out = pickOutput(input, newExt);
  args.push(out);

  const res = adl.exec({ program: ff, args: args, timeoutMs: 1800000 });
  if (!res || !res.ok) {
    return { ok: false, message: "ffmpeg 起不来：" + ((res && res.error) || "未知错误") };
  }
  if (res.code !== 0) {
    return { ok: false, message: describeFailure(res, out) };
  }
  if (!adl.fs.exists(out)) {
    return { ok: false, message: "ffmpeg 报成功，但没找到输出文件。" };
  }

  const verb = kind === "to-mp4" ? "转封装完成" : "音轨已抽出";
  adl.notify("媒体转换", verb + "\n" + out);
  return { ok: true, message: verb + "：" + out };
}

adl.onAction((c) => {
  const payload = c.payload || {};
  const action = c.action || "";
  const input = payload.path || "";

  if (!input) {
    return { ok: false, message: "这个任务还没有落盘文件。" };
  }
  if (!adl.fs.exists(input)) {
    return { ok: false, message: "文件已经不在原来的位置了：" + input };
  }
  return convert(action, input);
});
