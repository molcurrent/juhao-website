export const SITE_URL = "https://www.juhao.com";

export type PageData = {
  path: string;
  label: string;
  eyebrow: string;
  title: string;
  seoTitle: string;
  description: string;
  image: string;
  intro: string;
  type?: "page" | "service" | "article";
  published?: string;
  highlights: { title: string; text: string }[];
  sections: { title: string; text: string; points?: string[] }[];
  related: { label: string; href: string; text: string }[];
  faqs?: { question: string; answer: string }[];
};

export const pages: Record<string, PageData> = {
  "about": {
    path: "/about", label: "关于钜豪", eyebrow: "ABOUT JUHAO", title: "关于钜豪照明", seoTitle: "关于钜豪｜钜豪照明品牌介绍", image: "/images/home.jpg",
    description: "了解钜豪照明的品牌理念、业务方向与服务价值，认识品牌围绕健康照明、智能家居与渠道服务的持续探索。",
    intro: "钜豪以健康光环境为出发点，将照明产品、空间设计、智能控制和数字化服务连接起来，为家庭与不同类型空间提供清晰、可落地的光环境思路。",
    highlights: [{title:"健康人居",text:"从视觉舒适、空间层次与日常节律出发思考光。"},{title:"专业方案",text:"围绕住宅、商业、公共与工业空间梳理照明需求。"},{title:"智能协同",text:"让照明与窗帘、环境和安防设备自然联动。"}],
    sections: [{title:"品牌主张",text:"好房子，光健康。钜豪关注的不只是灯具本身，更关注人在空间里的真实感受。通过合理的亮度、色温、显色与分区控制，让光服务于休息、工作、交流与展示。"},{title:"我们提供什么",text:"从空间需求梳理到照明方案选择，再到智能控制和渠道服务，钜豪希望让复杂的照明决策更简单。",points:["全屋与场景照明方案","商业、公共与工业空间照明思路","智能家居照明联动","照明选品与渠道服务"]}],
    related: [{label:"查看照明解决方案",href:"/solutions",text:"按不同空间找到对应的光环境思路。"},{label:"了解智能家居照明",href:"/smart-home",text:"探索灯光与空间设备的协同。"},{label:"联系钜豪照明",href:"/contact",text:"提交方案或合作需求。"}]
  },
  "solutions": {
    path: "/solutions", label: "照明解决方案", eyebrow: "LIGHTING SOLUTIONS", title: "空间照明解决方案", seoTitle: "照明解决方案｜全屋·商业·公共·工业｜钜豪照明", image: "/images/business.jpg", type:"service",
    description: "按空间浏览钜豪照明解决方案，涵盖全屋、商业、公共与工业照明，并进入对应场景页面了解方案重点。",
    intro: "不同空间有不同的使用节奏与视觉任务。钜豪从人的活动、空间功能和维护需求出发，帮助用户建立更清晰的照明方案框架。",
    highlights: [{title:"全屋照明",text:"关注生活节律、舒适氛围与分区控制。"},{title:"商业照明",text:"兼顾品牌表达、商品呈现与顾客体验。"},{title:"公共照明",text:"重视安全、识别、耐久与维护效率。"},{title:"工业照明",text:"围绕作业可见度、稳定性与能源效率。"}],
    sections: [{title:"从空间需求开始",text:"好的方案不是堆叠灯具，而是先看空间里的人要做什么。动线、停留、阅读、展示、作业与休息，都会影响光的层次和控制方式。"},{title:"方案关注维度",text:"通过照度、色温、显色、眩光、配光与智能控制等维度，形成匹配场景的照明组合。",points:["明确空间用途与视觉任务","规划基础光、重点光和氛围光","选择适合的灯具与控制方式","兼顾安装、维护与长期使用"]}],
    related: [{label:"全屋照明解决方案",href:"/solutions/residential",text:"为家庭日常建立舒适光环境。"},{label:"商业照明解决方案",href:"/solutions/commercial",text:"让光参与空间体验与品牌表达。"},{label:"公共照明解决方案",href:"/solutions/public",text:"面向公共空间的安全与效率。"},{label:"工业照明解决方案",href:"/solutions/industrial",text:"服务生产与作业环境。"}]
  },
  "solutions/residential": {
    path:"/solutions/residential",label:"全屋照明",eyebrow:"RESIDENTIAL LIGHTING",title:"全屋照明解决方案",seoTitle:"全屋照明解决方案｜健康家居光环境｜钜豪照明",image:"/images/home.jpg",type:"service",
    description:"了解全屋照明的空间规划、健康光环境思路与方案咨询入口，让灯光更贴合家庭日常使用。",
    intro:"全屋照明不是每个房间各选一盏灯，而是根据家庭成员、活动时间和空间关系，建立连续而有层次的光环境。",
    highlights:[{title:"客餐厅",text:"兼顾交流、用餐、观影与展示的多场景切换。"},{title:"卧室",text:"以柔和、低眩光的光支持放松与睡前节律。"},{title:"书房",text:"关注桌面照度、显色与长时间用眼舒适。"},{title:"厨卫",text:"让操作区域清晰可见，同时减少阴影和眩光。"}],
    sections:[{title:"家庭光环境怎么规划",text:"先确定每个空间的核心活动，再组合基础光、重点光与氛围光。通过分区回路或智能场景，让同一空间在不同时间拥有合适的亮度和色温。"},{title:"方案重点",text:"全屋照明需要同时兼顾视觉舒适、空间审美和使用便利。",points:["控制眩光，避免直视高亮光源","重视真实显色与材质表现","用多层次照明减少空间单调感","预留场景控制与后期调整能力"]}],
    related:[{label:"智能家居照明",href:"/smart-home",text:"让全屋灯光随生活场景联动。"},{label:"商业照明解决方案",href:"/solutions/commercial",text:"了解商业空间的光环境思路。"},{label:"咨询全屋照明方案",href:"/contact",text:"提交户型与使用需求。"}],faqs:[{question:"全屋照明应该从什么时候开始规划？",answer:"建议在空间布局和电气点位确定前开始，以便同时考虑灯位、回路、控制方式和后期使用场景。"},{question:"无主灯是否适合所有家庭？",answer:"无主灯是一种设计方式，不是固定答案。应根据层高、空间功能、维护习惯和预算选择合适的照明组合。"}]
  },
  "solutions/commercial": {
    path:"/solutions/commercial",label:"商业照明",eyebrow:"COMMERCIAL LIGHTING",title:"商业照明解决方案",seoTitle:"商业照明解决方案｜专业空间光环境｜钜豪照明",image:"/images/business.jpg",type:"service",
    description:"了解商业照明的空间需求、光环境思路与方案咨询入口，探索灯光与商业空间体验的结合。",
    intro:"商业照明既要让人看清，也要让空间被记住。钜豪从业态、品牌定位、商品材质和顾客动线出发，构建具有层次的商业光环境。",
    highlights:[{title:"零售门店",text:"突出商品层次与材质，支持陈列灵活变化。"},{title:"酒店空间",text:"用连续光环境串联抵达、停留与休息体验。"},{title:"餐饮空间",text:"兼顾食物显色、桌面氛围与动线识别。"},{title:"办公空间",text:"支持专注、交流与会议等不同工作模式。"}],
    sections:[{title:"光与商业体验",text:"亮度对比会引导视线，色温和显色会影响材质感受，控制方式则决定空间能否灵活响应营业节奏。"},{title:"方案重点",text:"商业项目需要在体验、能耗、安装与运营之间取得平衡。",points:["根据顾客动线设置视觉焦点","匹配商品与材料的显色需求","用场景控制适配不同时段","考虑长期维护与更新效率"]}],
    related:[{label:"全屋照明解决方案",href:"/solutions/residential",text:"查看家庭光环境思路。"},{label:"公共照明解决方案",href:"/solutions/public",text:"了解公共空间照明。"},{label:"咨询商业照明方案",href:"/contact",text:"提交项目类型与空间需求。"}]
  },
  "solutions/public": {
    path:"/solutions/public",label:"公共照明",eyebrow:"PUBLIC LIGHTING",title:"公共照明解决方案",seoTitle:"公共照明解决方案｜公共空间光环境｜钜豪照明",image:"/images/public.jpg",type:"service",
    description:"了解公共空间照明的方案重点、应用思路与项目咨询入口，按实际项目需求获取进一步信息。",
    intro:"公共空间的光要服务于安全、识别和持续运行。方案需要结合人流、道路、建筑界面、使用时段与维护条件综合考虑。",
    highlights:[{title:"道路与通行",text:"保障识别与安全，同时控制眩光和溢出光。"},{title:"城市建筑",text:"用克制的光突出结构、材质与夜间秩序。"},{title:"教育医疗",text:"根据不同功能区域建立清晰、舒适的光环境。"},{title:"交通空间",text:"支持导向识别、长时运行与便捷维护。"}],
    sections:[{title:"面向长期使用",text:"公共照明既要满足当下的视觉任务，也要考虑运行稳定、维护便利和对周边环境的影响。"},{title:"方案重点",text:"从实际项目条件出发确定配光、控制和设备选择。",points:["识别人流与车辆的主要视线方向","控制眩光、暗区与不必要的溢出光","根据时段设置分级照明策略","评估安装环境与维护条件"]}],
    related:[{label:"商业照明解决方案",href:"/solutions/commercial",text:"了解商业空间光环境。"},{label:"工业照明解决方案",href:"/solutions/industrial",text:"查看生产空间照明思路。"},{label:"咨询公共照明方案",href:"/contact",text:"提交项目场景与需求。"}]
  },
  "solutions/industrial": {
    path:"/solutions/industrial",label:"工业照明",eyebrow:"INDUSTRIAL LIGHTING",title:"工业照明解决方案",seoTitle:"工业照明解决方案｜工业空间光环境｜钜豪照明",image:"/images/industrial.jpg",type:"service",
    description:"了解工业照明的空间需求、方案重点与项目咨询入口，按具体使用环境获取进一步信息。",
    intro:"工业照明围绕作业可见度、运行稳定和维护效率展开。不同高度、环境条件与精细作业，对照明有不同要求。",
    highlights:[{title:"生产车间",text:"匹配作业精度与设备布局，减少视觉疲劳。"},{title:"仓储物流",text:"关注货架垂直照度、通道识别与运行效率。"},{title:"高大空间",text:"结合安装高度与维护条件选择合理配光。"},{title:"特殊环境",text:"根据温度、粉尘、潮湿等条件评估设备适配。"}],
    sections:[{title:"从作业任务出发",text:"先明确人员需要看清什么、观察距离多远、设备如何排布，再确定照度、均匀度、显色和眩光控制目标。"},{title:"方案重点",text:"工业空间强调可见度、稳定性和全生命周期使用。",points:["按作业精细程度规划照明水平","减少设备与人员造成的遮挡阴影","结合班次设置分区与按需控制","考虑清洁、检修与更换便利性"]}],
    related:[{label:"公共照明解决方案",href:"/solutions/public",text:"查看公共空间照明思路。"},{label:"全部照明解决方案",href:"/solutions",text:"浏览其他空间类型。"},{label:"咨询工业照明方案",href:"/contact",text:"提交现场条件与作业需求。"}]
  },
  "smart-home": {
    path:"/smart-home",label:"智能家居",eyebrow:"SMART HOME LIGHTING",title:"智能家居照明解决方案",seoTitle:"智能家居照明解决方案｜钜豪智能",image:"/images/home.jpg",type:"service",
    description:"了解智能灯光与空间设备联动的使用场景、系统组成和方案咨询入口，探索自然便捷的智能家居体验。",
    intro:"真正自然的智能体验，不需要频繁操作。灯光、窗帘、环境和安防可以根据时间、活动与空间状态协同工作。",
    highlights:[{title:"回家场景",text:"灯光与窗帘协同响应，让空间自然进入欢迎状态。"},{title:"观影场景",text:"一键调整亮度与遮光，减少重复操作。"},{title:"睡眠场景",text:"逐步降低环境亮度，为休息建立柔和过渡。"},{title:"离家场景",text:"统一关闭或检查设备状态，简化日常管理。"}],
    sections:[{title:"智能的价值在于场景",text:"单个设备联网并不等于好的智能家居。更重要的是根据真实生活编排场景，并保留简单直观的手动控制。"},{title:"规划重点",text:"智能照明应与空间设计、电气点位和家庭习惯同步规划。",points:["先梳理高频生活场景","保留稳定、直观的基础控制","按空间设置分区与权限","为后期调整留出扩展空间"]}],
    related:[{label:"全屋照明解决方案",href:"/solutions/residential",text:"先建立家庭光环境基础。"},{label:"查看照明解决方案",href:"/solutions",text:"浏览不同空间照明类型。"},{label:"咨询智能家居方案",href:"/contact",text:"提交户型与联动需求。"}],faqs:[{question:"智能照明一定要使用手机控制吗？",answer:"不一定。合理的系统应保留墙面控制、场景按键和自动化逻辑，手机更适合作为设置与远程管理入口。"},{question:"智能照明应该在装修哪个阶段确定？",answer:"建议在电气点位和回路规划前确定主要场景与控制方式，减少后期调整成本。"}]
  },
  "mall": {
    path:"/mall",label:"钜豪商城",eyebrow:"JUHAO MALL",title:"钜豪商城",seoTitle:"钜豪商城｜照明选品与渠道服务平台",image:"/images/business.jpg",
    description:"了解钜豪商城的照明选品、订单、客户与分销服务，并获取平台及合作咨询入口。",
    intro:"钜豪商城围绕照明选品与渠道协作，连接商品、订单、客户与服务，帮助合作伙伴更清晰地管理业务流程。",
    highlights:[{title:"照明选品",text:"按品类和场景组织商品，提升选品效率。"},{title:"订单协同",text:"连接销售与采购环节，减少重复沟通。"},{title:"客户服务",text:"沉淀需求和服务记录，支持长期经营。"},{title:"分销协作",text:"为渠道拓展与内容分享提供数字化入口。"}],
    sections:[{title:"从商品到服务",text:"照明业务不仅是商品交易，还包含方案理解、空间匹配、交付与后续服务。平台帮助这些环节建立更清晰的连接。"},{title:"平台能力",text:"根据实际合作模式，平台可承载选品、订单与渠道协同。",points:["按空间与用途浏览照明商品","连接销售订单与采购需求","支持门店与合作伙伴协作","为客户提供持续服务入口"]}],
    related:[{label:"查看照明解决方案",href:"/solutions",text:"从空间需求进入方案选择。"},{label:"智能家居照明",href:"/smart-home",text:"了解智能场景规划。"},{label:"商城与合作咨询",href:"/contact",text:"提交平台合作需求。"}]
  },
  "news": {
    path:"/news",label:"新闻资讯",eyebrow:"NEWS & INSIGHTS",title:"钜豪照明新闻与资讯",seoTitle:"钜豪照明新闻｜品牌动态与照明资讯",image:"/images/public.jpg",
    description:"查看钜豪照明品牌动态、解决方案资讯与照明知识文章，进入详情页阅读完整内容。",
    intro:"持续分享健康光环境、空间照明和智能家居相关知识，帮助用户在真实需求中理解光、选择光、使用光。",
    highlights:[{title:"照明知识",text:"理解照度、色温、显色与眩光等关键概念。"},{title:"空间方案",text:"从家庭、商业与公共空间拆解照明思路。"},{title:"智能生活",text:"探索灯光和空间设备的自然协同。"}],
    sections:[{title:"最新内容",text:"以下内容为钜豪照明围绕健康光与智能生活整理的专题文章。",points:["《家庭健康光环境：从看得见到住得舒适》","《智能家居照明：先设计生活场景，再选择控制方式》"]}],
    related:[{label:"家庭健康光环境",href:"/news/healthy-home-lighting",text:"了解家庭照明规划的四个关键维度。"},{label:"智能家居照明怎么规划",href:"/news/smart-lighting-planning",text:"从真实生活场景建立控制逻辑。"},{label:"全部照明解决方案",href:"/solutions",text:"进入对应空间的方案页面。"}]
  },
  "news/healthy-home-lighting": {
    path:"/news/healthy-home-lighting",label:"家庭健康光环境",eyebrow:"LIGHTING INSIGHT",title:"家庭健康光环境：从看得见到住得舒适",seoTitle:"家庭健康光环境怎么规划｜钜豪照明资讯",image:"/images/home.jpg",type:"article",published:"2026-07-12",
    description:"从视觉舒适、空间层次、生活节律和控制方式四个维度，了解家庭健康光环境的基础规划思路。",
    intro:"健康光环境不是一个孤立参数，而是人与空间、时间和活动共同作用的结果。家庭照明规划可以从四个容易理解的维度开始。",
    highlights:[{title:"视觉舒适",text:"看得清，同时避免高亮光源直接进入视线。"},{title:"空间层次",text:"基础光、重点光和氛围光各有职责。"},{title:"生活节律",text:"不同时间与活动需要不同亮度和色温感受。"},{title:"控制方式",text:"让常用场景容易触达，不增加操作负担。"}],
    sections:[{title:"一、先看活动，再看灯具",text:"客厅可能同时承载交流、阅读、观影和清洁。先列出主要活动，再判断哪些区域需要基础照明、哪些位置需要重点补光，比直接从灯具款式开始更有效。"},{title:"二、控制眩光与明暗反差",text:"过亮的裸露光源、屏幕周围过暗的环境、桌面与背景强烈反差，都可能影响舒适感。合理的遮光、配光和环境亮度能改善体验。"},{title:"三、让控制服务于生活",text:"好的控制方式应该让回家、用餐、观影、阅读和睡前等高频场景简单可用，同时保留直观的基础开关。"}],
    related:[{label:"全屋照明解决方案",href:"/solutions/residential",text:"查看家庭不同空间的照明重点。"},{label:"智能家居照明",href:"/smart-home",text:"了解场景联动与控制规划。"},{label:"返回照明资讯",href:"/news",text:"阅读更多光环境内容。"}]
  },
  "news/smart-lighting-planning": {
    path:"/news/smart-lighting-planning",label:"智能照明规划",eyebrow:"SMART LIGHTING INSIGHT",title:"智能家居照明：先设计生活场景，再选择控制方式",seoTitle:"智能家居照明怎么规划｜钜豪照明资讯",image:"/images/business.jpg",type:"article",published:"2026-07-12",
    description:"了解智能家居照明的规划顺序：先梳理高频生活场景，再确定分区、回路、控制方式与联动逻辑。",
    intro:"智能照明的核心不是设备数量，而是空间能否在合适的时刻给出合适的光。清晰的场景比复杂的功能列表更重要。",
    highlights:[{title:"场景优先",text:"先确定回家、用餐、观影和睡眠等高频需求。"},{title:"分区清晰",text:"让每个回路和灯组的职责容易理解。"},{title:"保留手动",text:"自动化之外仍应有直观可靠的基础控制。"},{title:"持续调整",text:"入住后根据真实习惯逐步优化场景。"}],
    sections:[{title:"先写下生活的一天",text:"从起床、离家、回家、用餐到休息，记录家庭最常发生的活动。哪些动作值得一键完成，哪些状态适合自动触发，会因此变得清晰。"},{title:"再确定灯光分区",text:"灯光分区应对应空间功能，而不是机械地按灯具类型划分。阅读区、餐桌、电视背景和通道可以拥有独立且容易理解的控制。"},{title:"最后选择控制方式",text:"墙面按键、传感器、语音和手机各有适合的场景。组合时应优先保证稳定和直观，再增加自动化与远程能力。"}],
    related:[{label:"智能家居照明解决方案",href:"/smart-home",text:"了解常见智能生活场景。"},{label:"全屋照明解决方案",href:"/solutions/residential",text:"建立家庭光环境基础。"},{label:"返回照明资讯",href:"/news",text:"阅读更多光环境内容。"}]
  },
  "contact": {
    path:"/contact",label:"联系合作",eyebrow:"CONTACT JUHAO",title:"联系钜豪照明",seoTitle:"联系钜豪照明｜方案咨询与合作",image:"/images/public.jpg",
    description:"提交照明方案、智能家居或渠道合作需求，查看准备信息与对应咨询方向。",
    intro:"为了更准确地理解需求，建议先准备空间类型、项目阶段、所在城市和希望解决的问题。联系方式将在企业确认后补充到官网。",
    highlights:[{title:"照明方案",text:"住宅、商业、公共或工业空间的照明需求。"},{title:"智能家居",text:"灯光、窗帘、环境与安防的场景联动需求。"},{title:"商城合作",text:"照明选品、门店经营与渠道协作需求。"},{title:"品牌合作",text:"项目、内容与其他业务合作方向。"}],
    sections:[{title:"咨询前建议准备",text:"清晰的信息能让后续沟通更高效。",points:["空间或项目类型","当前所处阶段","面积、图纸或现场条件","主要使用人群与活动","期望解决的问题与时间计划"]},{title:"联系信息",text:"正式电话、邮箱、地址及表单入口需要由企业确认后发布，当前页面不展示未经核验的联系信息。"}],
    related:[{label:"查看照明解决方案",href:"/solutions",text:"先浏览对应空间的方案重点。"},{label:"了解智能家居照明",href:"/smart-home",text:"梳理常见场景与规划顺序。"},{label:"了解钜豪商城",href:"/mall",text:"查看平台与渠道服务。"}]
  }
};
