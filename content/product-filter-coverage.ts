export type EngineeringFilterKey =
  | "power"
  | "cct"
  | "cri"
  | "beam-angle"
  | "dimensions"
  | "installation";

export type EngineeringFilterDefinition = {
  key: EngineeringFilterKey;
  label: string;
  parameterNames: readonly string[];
  normalizationApproved: boolean;
};

type ProductFilterInput = {
  parameters: readonly {
    name: string;
    value: string;
  }[];
};

export type EngineeringFilterCoverage = EngineeringFilterDefinition & {
  coveredProducts: number;
  missingProducts: number;
  totalProducts: number;
  state: "missing" | "partial" | "unstandardized" | "ready";
  filterEnabled: boolean;
  gapMessage: string;
};

export const engineeringFilterDefinitions: readonly EngineeringFilterDefinition[] = [
  { key: "power", label: "功率", parameterNames: ["功率", "额定功率"], normalizationApproved: false },
  { key: "cct", label: "色温", parameterNames: ["色温"], normalizationApproved: false },
  { key: "cri", label: "显色指数", parameterNames: ["显色指数", "显指"], normalizationApproved: false },
  { key: "beam-angle", label: "光束角", parameterNames: ["光束角"], normalizationApproved: false },
  { key: "dimensions", label: "尺寸", parameterNames: ["尺寸"], normalizationApproved: false },
  { key: "installation", label: "安装方式", parameterNames: ["安装方式"], normalizationApproved: false },
];

export function buildEngineeringFilterCoverage(products: readonly ProductFilterInput[]) {
  const totalProducts = products.length;

  return engineeringFilterDefinitions.map((definition): EngineeringFilterCoverage => {
    const acceptedNames = new Set(definition.parameterNames);
    const coveredProducts = products.filter((product) => product.parameters.some((parameter) =>
      acceptedNames.has(parameter.name.trim()) && parameter.value.trim().length > 0
    )).length;
    const missingProducts = totalProducts - coveredProducts;
    const filterEnabled = totalProducts > 0
      && coveredProducts === totalProducts
      && definition.normalizationApproved;
    const state = filterEnabled
      ? "ready"
      : coveredProducts === 0
        ? "missing"
        : missingProducts > 0
          ? "partial"
          : "unstandardized";
    const gapMessage = coveredProducts === 0
      ? `当前 ${totalProducts} 款均缺少独立${definition.label}字段。`
      : missingProducts > 0
        ? `已有 ${coveredProducts}/${totalProducts} 款来源字段，仍缺 ${missingProducts} 款；字段值尚未完成格式与取值标准化。`
        : definition.normalizationApproved
          ? `当前 ${totalProducts} 款字段覆盖完整并已完成标准化。`
          : `当前 ${totalProducts} 款字段覆盖完整，但尚未完成格式与取值标准化。`;

    return {
      ...definition,
      coveredProducts,
      missingProducts,
      totalProducts,
      state,
      filterEnabled,
      gapMessage,
    };
  });
}
