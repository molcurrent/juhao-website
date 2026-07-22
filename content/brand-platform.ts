export const brandPlatform = {
  name: "JUHAO",
  positioning: {
    zh: "让每个空间，都拥有更适合人的光。",
    en: "Lighting for better spaces.",
    identity: ["专业照明", "智能控制", "空间解决方案"],
  },
  audiences: [
    {
      code: "01",
      label: "家庭与居住者",
      title: "为正在生活的家规划光",
      description: "从户型、家庭成员和日常活动开始，梳理客餐厅、阅读、休息与夜间起居的光环境。",
      kind: "home-health",
      cta: "获取空间建议",
    },
    {
      code: "02",
      label: "设计与工程团队",
      title: "把空间意图转成照明任务书",
      description: "围绕项目类型、设计阶段、图纸条件和交付节点，连接方案、产品与控制需求。",
      href: "/contact#contact-directions-title",
      cta: "选择设计 / 工程路径",
    },
    {
      code: "03",
      label: "渠道合作伙伴",
      title: "从区域与服务能力开始合作",
      description: "说明所在区域、团队基础、目标客户与合作方向，让渠道沟通从真实经营条件开始。",
      kind: "channel",
      cta: "了解合作路径",
    },
  ],
  methodology: [
    { code: "01", title: "理解空间", text: "核对使用者、活动、尺度、材质与时间节奏。" },
    { code: "02", title: "规划光层", text: "划分基础光、重点光、任务光与氛围光。" },
    { code: "03", title: "匹配产品", text: "根据配光、安装、维护与资料完整度筛选产品。" },
    { code: "04", title: "设计控制", text: "把高频活动转为容易理解、可手动调整的场景。" },
    { code: "05", title: "持续服务", text: "保留项目阶段、产品清单与后续沟通记录。" },
  ],
  valuePillars: [
    { en: "HUMAN", title: "从人的活动开始", text: "先理解谁在使用、要完成什么，再讨论灯具。" },
    { en: "SPACE", title: "回应空间任务", text: "让光配合尺度、材质、动线与运营节奏。" },
    { en: "TECHNOLOGY", title: "让技术容易使用", text: "把产品与控制连接成清晰、可调整的日常场景。" },
  ],
  architecture: [
    { code: "01", name: "JUHAO Lighting", role: "专业照明产品与空间光环境方案", href: "/products", cta: "进入产品与方案" },
    { code: "02", name: "JUHAO Smart", role: "围绕真实活动组织智能照明与设备协同", href: "/smart-home", cta: "查看智能生态" },
    { code: "03", name: "JUHAO Store", role: "承接选品、采购、订单与渠道业务", href: "/mall", cta: "查看商城状态" },
  ],
  smartModes: [
    { title: "回家", copy: "从入户到主要活动区逐步点亮，保留玄关与通行所需的清晰照明。" },
    { title: "阅读", copy: "让桌面任务光与环境光协同，避免只有局部高亮造成强烈反差。" },
    { title: "会客", copy: "兼顾人物面部、桌面与空间背景，让交流场景自然、有层次。" },
    { title: "睡眠", copy: "降低不必要的亮度与直视光，为睡前活动和夜间起居保留柔和照明。" },
    { title: "离家", copy: "集中关闭非必要回路并保留需要的联动提醒；具体兼容范围以审核资料为准。" },
  ],
} as const;
