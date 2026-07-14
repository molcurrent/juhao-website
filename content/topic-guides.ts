export type TopicGuide = {
  status: string;
  media: { src: string; alt: string; caption: string }[];
  scenarios: { title: string; task: string; checks: string[] }[];
  comparisonFields: { label: string; parameter?: string; note?: string }[];
  related: { title: string; text: string; href: string; status?: string }[];
  faqs: { question: string; answer: string }[];
  missingEvidence: string[];
};

export const topicGuides: Partial<Record<string, TopicGuide>> = {
  spotlights: {
    status: "私有预览 6 款来源字段已通过机器校验的产品；当前站点素材批次授权已登记，轨道产品、人工签核与完整光学参数仍待补齐。",
    media: [
      {
        src: "media-6bd0173593eaefdeac16",
        alt: "JH-S288 宽边款射灯企业商城产品资料图",
        caption: "宽边款产品资料图｜来源：企业商城商品 12287",
      },
      {
        src: "media-6bd0173593eaefdeac16",
        alt: "JH-S288 窄边款射灯企业商城产品资料图",
        caption: "窄边款产品资料图｜来源：企业商城商品 12286",
      },
      {
        src: "media-6bd0173593eaefdeac16",
        alt: "JH-S288 预埋款射灯企业商城产品资料图",
        caption: "预埋款产品资料图｜来源：企业商城商品 12285",
      },
    ],
    scenarios: [
      { title: "客厅墙面与陈设", task: "明确要照亮整面墙、画作还是材质细节。", checks: ["层高与目标位置", "光束角与配光数据", "常用坐姿下的眩光和反射"] },
      { title: "餐桌与局部停留", task: "让重点光落在使用区域，同时检查桌面反射。", checks: ["桌面尺寸与灯位", "显色资料", "与环境光的亮度关系"] },
      { title: "卧室阅读与夜间", task: "分别按站姿、坐姿和卧姿检查直视光源。", checks: ["床头与阅读位置", "最低稳定亮度", "实体控制与回退方式"] },
      { title: "零售陈列", task: "按入口、主通道和重点展台分配基础光与重点光。", checks: ["陈列变化与可调角度", "商品材质和反射", "配光与瞄准样板"] },
    ],
    comparisonFields: [
      { label: "功率", note: "型号字段显示 24W / 30W；额定输入功率仍待正式规格书确认" },
      { label: "尺寸", parameter: "尺寸" },
      { label: "材质", parameter: "材质" },
      { label: "光源类型", parameter: "光源类型" },
      { label: "商城适用空间", parameter: "空间" },
      { label: "安装边框", note: "以产品名称和安装说明为准" },
      { label: "光束角", note: "正式资料待补充" },
      { label: "色温", note: "正式资料待补充" },
      { label: "显色指数", note: "正式检测资料待补充" },
    ],
    related: [
      { title: "深圳华发冰雪世界 JW 万豪酒店", text: "签约 / 中标项目；页面展示空间方案方向，不作为完工证明。", href: "/cases/jw-marriott-shenzhen-huafa-snow-world", status: "项目动态" },
      { title: "上饶广丰铂尔曼酒店", text: "签约 / 中标项目；重点照明方向以项目最终清单为准。", href: "/cases/pullman-shangrao-guangfeng", status: "项目动态" },
    ],
    faqs: [
      { question: "射灯应该统一离墙多少厘米？", answer: "没有适用于所有项目的统一距离。层高、光束角、配光、瞄准角、墙面材质和目标位置都需要一起核对，并用实际灯具做样板。" },
      { question: "光束角越小，灯就越亮吗？", answer: "不能这样判断。较小光束角通常让光斑更集中，但光束角不等于总光通量，也不能单独代表中心亮度。" },
      { question: "深杯射灯一定不眩光吗？", answer: "深杯和挡光结构可以减少部分方向直视高亮发光面的机会，但眩光还与安装位置、观察方向、背景亮度和反射有关。" },
    ],
    missingEvidence: ["6 款产品的光束角、色温、显色与完整配光文件", "轨道灯及轨道系统的审核产品资料", "不同层高与墙面条件下的企业样板记录"],
  },
  "ceiling-lights": {
    status: "私有预览 6 款来源字段已通过机器校验的产品；当前站点素材批次授权已登记，更多型号与人工签核按台账逐款推进。",
    media: [
      {
        src: "media-85965b968be3cdc31078",
        alt: "JH-8L8709 家居顶灯企业商城资料图",
        caption: "JH-8L8709 产品资料图｜来源：企业商城商品 12217",
      },
      {
        src: "media-bd38555883752f000d6c",
        alt: "120112-500 屿光吊灯企业商城产品资料图",
        caption: "120112-500 产品资料图｜来源：企业商城商品 12377",
      },
      {
        src: "media-d2232e3ec1d5cd0e6229",
        alt: "120112-800+500 屿光吊灯企业商城产品资料图",
        caption: "120112-800+500 产品资料图｜来源：企业商城商品 12378",
      },
    ],
    scenarios: [
      { title: "客厅会客与观影", task: "基础光、墙面光和局部任务光分开考虑。", checks: ["电视屏幕反射", "会客与清洁状态", "分区或场景控制"] },
      { title: "餐桌与用餐", task: "优先保证桌面照明舒适和食物颜色自然。", checks: ["灯具高度与遮光", "桌面范围", "显色资料"] },
      { title: "卧室与夜间", task: "把整理、阅读和夜间通行分开控制。", checks: ["躺卧视角", "低位夜间光", "最低稳定亮度"] },
      { title: "书房与任务面", task: "检查桌面照度、屏幕反射与明暗反差。", checks: ["桌面位置", "光色一致性", "任务灯协同"] },
      { title: "儿童房", task: "从活动、阅读、休息和夜间通行分别定义需要。", checks: ["高亮发光面", "控制是否易懂", "产品安全与检测资料"] },
    ],
    comparisonFields: [
      { label: "尺寸", parameter: "尺寸" },
      { label: "材质", parameter: "材质" },
      { label: "光源类型", parameter: "光源类型" },
      { label: "商城建议面积", parameter: "面积" },
      { label: "商城适用空间", parameter: "空间" },
      { label: "光源数量（商城原字段）", parameter: "光源数量" },
      { label: "显色指数", note: "正式检测资料待补充" },
      { label: "维护条件", note: "清洁方式、易损件与检修路径待正式资料确认" },
      { label: "控制方式", note: "开关、调光或智能控制能力须按具体型号与驱动组合确认" },
    ],
    related: [
      { title: "全屋照明解决方案", text: "从户型、活动和控制方式建立家庭光环境。", href: "/solutions/residential", status: "家庭应用" },
    ],
    faqs: [
      { question: "顶灯瓦数越大，空间就一定越亮吗？", answer: "不能只用瓦数判断。还要看光通量、配光、安装高度、空间表面和实际使用任务。当前商城“光源数量”字段也需要企业进一步确认语义。" },
      { question: "全屋必须统一一个色温吗？", answer: "不必机械统一。应结合空间功能、材质、自然光、相邻空间和使用者偏好，并检查同一视野内的光色协调。" },
      { question: "一盏顶灯可以解决客厅所有照明吗？", answer: "客厅通常同时承担通行、会客、阅读、清洁和观影等任务，基础光、任务光和重点光分层更容易适配不同活动。" },
    ],
    missingEvidence: ["6 款产品的显色、光通量、配光与检测报告", "商城“光源数量”字段与 W 数值的正式释义", "具体型号在家庭项目中的授权应用证据"],
  },
  "smart-home-devices": {
    status: "当前 0 款候选设备完成协议、供电、安装、兼容与售后资料审核；私有预览先展示选型方法，审核一款再发布一款。",
    media: [
      { src: "/images/juhao-home.webp", alt: "钜豪智能家庭空间照明场景", caption: "智能家庭场景示意｜产品型号与兼容范围待审核" },
      { src: "/images/juhao-commercial.webp", alt: "灯光场景控制与空间联动示意", caption: "场景控制示意｜不代表已审核的具体产品能力" },
    ],
    scenarios: [
      { title: "照明场景控制", task: "先定义回家、会客、观影、阅读和夜间等真实任务。", checks: ["驱动与调光协议", "低亮稳定性", "断网后的实体控制"] },
      { title: "智能晾晒", task: "核对供电、安装结构、承重、控制和售后边界。", checks: ["安装尺寸", "电气与结构条件", "本地控制与维护"] },
      { title: "浴室环境", task: "把照明、取暖、排风和潮湿环境安全分别确认。", checks: ["回路与总功率", "防潮和安装位置", "风道、噪声与维修空间"] },
      { title: "入户与安防", task: "明确开锁、权限、日志、断电和隐私责任。", checks: ["供电与应急方式", "权限和数据处理", "长期维护责任"] },
    ],
    comparisonFields: [],
    related: [
      { title: "智能家居场景", text: "查看回家、观影、睡眠和离家等场景的规划顺序。", href: "/smart-home", status: "系统方案" },
    ],
    faqs: [
      { question: "接入智能系统后，所有灯都能无级调光吗？", answer: "不能这样承诺。灯具驱动、控制协议、调光曲线、负载和系统兼容性都需要逐项核对。" },
      { question: "智能照明一定要使用手机控制吗？", answer: "不一定。高频操作应保留容易理解的墙面或实体控制，并考虑断网、网关故障时的基本照明回退。" },
      { question: "为什么专题暂时没有产品？", answer: "候选商品虽然有图片和在售记录，但协议、供电、尺寸、安装、兼容和售后等结构化参数不足，尚不能支持可靠选型。" },
    ],
    missingEvidence: ["候选产品的协议、供电、安装尺寸与兼容范围", "断网、断电和本地控制验证", "检测、隐私、售后与长期维护资料"],
  },
};

export function topicGuideBySlug(slug: string) {
  return topicGuides[slug];
}
