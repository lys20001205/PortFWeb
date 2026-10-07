# 云际飞行 Cloudline 1.2.0

手机触控优先的轻量 WebGL 飞行小游戏。此目录独立发布，未替换 PortFWeb 的原主页、作品页面或原有 Render 配置。

## 本版内容

新增 A320-216 / CFM56 风格的双发客机、经典短翼尖围栏和红白配色。模型比例、操纵响应与气动参数为游戏近似，不是认证机型模型。

BKI → CAN T3 任务包含亚庇滑跑、离场爬升、南海巡航、广州下降、进近、接地减速、滑行与 SIM-T3 机位停车。也可直接从广州进近或落地后的滑行场景开始。原有 L-4、J-120、自由飞行和引导圈挑战保留。

教学领航默认关闭；打开后演示完整任务，动摇杆、方向舵、刹车或触屏油门可接管。独立的 AP 只保持高度、航向与空速，不执行自动落地或避障。

## 手机操作

建议横屏。左摇杆向下拉抬机头、向上推低头，左右推动使机翼倾斜。右滑杆控制油门；支持两根手指同时操作。着陆后收油并按住刹车，低速跟随黄色滑行线和绿色标记到 SIM-T3，机位内刹停结束任务。切换应用自动暂停，返回后点继续。

第一次体验本航线可选 A320-216、BKI → CAN T3、晴空无风，进入后开启教学领航。可点跳至巡航或跳至下降，不必等待长途飞行。

## 简化边界

- 全程由多个局部场景衔接，不是全球地景连续流式加载，也不是当天航班轨迹回放。
- 巡航场景高度约 FL340；航程推进默认 128 倍，动力学仍为 1 倍。机场间大圆距离约 1963 km，仅用作示意进度，不能当作实际航路长度。
- BKI 与 CAN 的机场建筑、地形、跑道朝向、滑行道和进近路径均有简化。广州主跑道 01/19 是场景假设，SIM-T3 是虚构机位，远处平行跑道仅用于布景。
- T3 建筑为程序化外形示意，未使用精确测绘模型。没有真实 FMS、ILS、空管、天气下载、航图数据库或完整 Airbus 飞控法则。
- 提示空速、推力、配平、襟翼、失速及着陆评分均为游戏参数，不用于真实飞行训练。A320-216 是本任务的选定机型，未核实某一天航班的实际执飞机尾号。

## 运行与测试

本目录使用同站相对路径加载 CSS 和五个脚本，无第三方运行库。用静态服务器发布即可；刷新离线网页不保证可用。源码包另外提供真正内嵌资源的单文件 HTML，但附件预览器不一定执行 JavaScript/WebGL。

从此目录执行：

```sh
node regression.js
node route_regression.js
```

本地已通过原有 18 项飞行回归、新增 11 项航线回归、31 项浏览器检查，以及发布版独立 CSS/JS 加载等 4 项检查。浏览器环境为 Chromium + SwiftShader WebGL + Xvfb，触屏为模拟；不是 iPhone/Safari 真机验收。完整领航终点测试使用确定性晴空无风条件。测试摘要见 test-summary.json。仓库的 Cloudline checks 工作流会重新执行 29 项 Node 仿真测试。

## 发布

文件位于 /cloudline/。现有根目录 render.yaml 仍然发布仓库根目录；若既有 Render 服务确实关联 main 且启用自动部署，合并后该服务可发布此子目录。配置文件存在不等于服务已部署，公网 URL 和部署日志须另行核验。

## 参考资料

以下资料用于外观和任务背景，不构成完整飞行模型依据：

- Airbus A320ceo: https://www.aircraft.airbus.com/en/aircraft/a320-family/a320ceo
- Lufthansa Group A320-200 dimensions: https://www.lufthansagroup.com/de/unternehmen/flotte/discover-airlines/airbus-a320-200.html
- CAAM WBKK aerodrome information: https://aip.caam.gov.my/aip/eAIP/2026-02-19-AIRAC/html/eAIP/WM-AD-2.WBKK-en-MS.html
- AirAsia Guangzhou T3 notice: https://support.airasia.com/s/article/Guangzhou-Terminal-Change-CAN
