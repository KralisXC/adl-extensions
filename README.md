# ADL Extensions

[ADL](https://github.com/KralisXC/ADL) 的官方扩展中心。

每个扩展是一个独立目录，里面是一个完整的 ADL 插件（`plugin.toml` + `main.js` + 它需要的资源），
打包成 zip 挂在 [Releases](../../releases) 上，由 ADL 的「从压缩包安装…」一键安装。

## 用

在 ADL 里装插件有两种办法，效果一样：

1. **从压缩包安装**：插件页右上角「从压缩包安装…」，选下载好的 zip。
   ADL 会解开到 `plugins/<id>/`，**装完自动删掉压缩包**。
2. **手动放**：把目录整个丢进 `plugins/` 下，重启 ADL。

> ⚠️ 带 `exec` 权限的插件（比如媒体转换要调 ffmpeg）需要 ADL 运行在**信任模式**
> （`--trusted`，或 `config.toml` 里 `mode = "trusted"`）。安全模式下这些插件的动作
> 按钮根本不会出现 —— 不是坏了，是被挡住了。

## 目录

| 扩展 | 说明 | 权限 |
|---|---|---|
| [`com.kralisxc.media-converter`](plugins/com.kralisxc.media-converter) | 下载完的视频/音频就地无损封装成 MP4，或抽出音轨成 m4a。**只做 `-c copy`，不重编码、不掉画质** | `exec` `notify` `fs_read` `fs_write` |

## 索引

[`index.json`](index.json) 是给 ADL 插件市场页用的清单（还没接上，先放着）。
字段：`id` / `name` / `version` / `description` / `zip` / `sha256` / `min_api`。

## 自己做一个

1. 在 `plugins/` 下新建 `<你的插件 id>/`，写 `plugin.toml` + `main.js`
   （格式见 [ADL 的插件文档](https://github.com/KralisXC/ADL/blob/main/plugins/README.md)）。
2. 跑 `./build.ps1 -Id <你的插件 id>`，在 `dist/` 拿到 zip 和它的 sha256。
3. 发一个 Release，把 zip 传上去，再往 `index.json` 里加一条。

`id` 别用 `com.adl.` 开头 —— 那个前缀是给 ADL 自带能力的（内置插件组，不可启停）。

## 许可

各扩展目录里带自己的许可。`com.kralisxc.media-converter` 内含 ffmpeg（GPLv3），
见该目录下 `bin/COPYING.GPLv3`。
