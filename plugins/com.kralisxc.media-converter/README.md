# 本地媒体转换（`com.kralisxc.media-converter`）

下载完的视频/音频就地进行**无损**封装：换个更通用的容器，或者把音轨单独抽出来。
**不重编码**（`-c copy`），画质和码率一个字节都不动，所以是秒级完成、CPU 几乎不占。

## 两个动作

在 ADL 任务行的「⋯」菜单里：

| 动作 | 做什么 | 结果 |
|---|---|---|
| **无损转 MP4** | mkv/avi/ts/flv/webm → mp4，`-movflags +faststart` 让 moov 前置（边下边播、拖动不卡） | 同名 `.mp4`（纯音频源则出 `.m4a`） |
| **提取音轨（m4a）** | 丢掉视频轨，只留音频 | 同名 `.m4a` |

输出和输入同目录。重名时追加时间戳，不覆盖原文件。

## 什么时候会失败（以及为什么）

无损封装的前提是**目标容器装得下原来的编码**：

- `h264` + `aac` 塞进 mp4 → 没问题
- `h265` / `vp9` / `av1` 塞进 mp4 → 多数播放器不认，ffmpeg 会直接报
  `Could not find tag for codec`；插件会翻成人话「塞不进目标容器，无损不可行」
- `mkv` 里的 `flac` / `opus` 塞进 mp4 → 同上

这类情况**只能重编码**才能解决，那就掉画质、耗时间了 —— 本插件**故意不做**。
需要真转码的话，直接拿 `bin/ffmpeg.exe` 自己跑一条命令更实在。

## 权限与模式

`plugin.toml` 里声明了：`exec`（调 ffmpeg）、`notify`、`fs_read` / `fs_write`（`"*"` = 任意路径）。

> ⚠️ **必须信任模式**（`--trusted`，或 `config.toml` 里 `mode = "trusted"`）。
> 安全模式下 ADL 根本不会把这几个动作放进菜单 —— 拿 `exec` 等于能跑任意程序，
> 不可能在安全模式放行。这不是插件坏了。

## 关于 ffmpeg

`bin/` 里是一整套 ffmpeg（`ffmpeg.exe` + `ffprobe.exe` + 10 个 MinGW 运行时 DLL），
**必须整套复制**。只拷 `ffmpeg.exe` 会报 `STATUS_DLL_NOT_FOUND`（`exit=-1073741515`），
因为这个 build 是动态链接的。

- 版本：`N-128119-gc220739be5`（MSYS2 / gcc 16.2.0 构建，`--enable-gpl --enable-version3`）
- **没有 libx264** —— 只能 `-c copy`，转不了码。这与插件定位一致。
- 许可：GPLv3，见 `bin/COPYING.GPLv3`。分发本插件即分发 ffmpeg，请遵守 GPLv3。

`bin/` 有 67 MB，所以**不在 git 里**（见 `.gitignore`），只随 GitHub Release 的 zip 包分发。
本地打包前把 `bin/` 拷进 `plugins/com.kralisxc.media-converter/bin/` 再跑 `build.ps1`。

## 装

下载 `com.kralisxc.media-converter-1.0.0.zip`，在 ADL 插件页点「从压缩包安装…」选它。
ADL 会解开到 `plugins/com.kralisxc.media-converter/`，装完自动删掉 zip。

也可以手动解压到 `plugins/com.kralisxc.media-converter/` 后重启 ADL。
