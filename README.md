# CalLog

个人用的热量 / 体重记录 App。数据存在自己的 Google 表格里，后端是绑定在表格上的 Apps Script（`Code.gs`）。

两种用法，数据是同一份：

- **网页版**：`callog.html` 放在 Google Drive 里，由 Apps Script 网页应用提供。
- **安卓 App**：`android-app/`（Capacitor），页面打包在 APK 里，读写时直接请求 Apps Script 网址（`Code.gs` 的 `doPost`）。

## 目录

| 路径 | 内容 |
|---|---|
| `Code.gs` | Apps Script 后端（粘贴进表格的 Apps Script 项目；第 15、16 行的密码和 API Key 不要提交到这里） |
| `src/` | 页面源码：`index.src.html` + `*.css` + `js/*.js` |
| `build.py` | 把 `src/` 拼成 `dist/callog.html` |
| `tools/` | 主题素材生成脚本（`*.src.css` → `src/*.css`）、App 图标生成脚本 |
| `test/` | 本地模拟后端（`server.js`）和端到端测试（`e2e.py`） |
| `android-app/` | 安卓外壳（Capacitor） |
| `.github/workflows/apk.yml` | 推送到 main 后自动编译 APK，发布在 Releases |

## 改页面

```bash
python3 tools/subst.py && python3 tools/gen4.py && python3 tools/gen5.py   # 只有改了 tools/*.src.css 才需要
python3 build.py                                                         # 生成 dist/callog.html
```

网页版：把 `dist/callog.html` 上传到 Google Drive（替换旧的）。
安卓版：推送到 main，等 Actions 编译完，在 Releases 里下载新的 APK 覆盖安装。

## 安卓 App 第一次使用

1. `Code.gs` 需要是带 App 读写接口的版本（`doPost` 里有「安卓 App 的读写请求」那段），更新后要在 Apps Script 里「部署 → 管理部署 → 编辑 → 新版本」。
2. 打开 App，填 Apps Script 网页应用的网址（以 `/exec` 结尾）和密码。直接粘贴手表步数用的那串网址（带 `?token=`）也可以，会自动取出密码。

APK 的签名文件加密后放在 `tools/callog.keystore.enc`，解密密码只存在仓库的 Secrets（`CALLOG_KS_PASS`）里。签名不变，新版 APK 才能直接覆盖安装。
