const catalogLabCss = String.raw`.catalogLab-page {
  min-height: 100dvh;
  color: #eeece7;
  background: #151513;
}

.catalogLab-srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.catalogLab-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.82fr);
  padding-top: var(--header-offset);
  overflow: hidden;
  border-bottom: 1px solid rgb(255 255 255 / 13%);
}

.catalogLab-heroCopy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(52px, 6vw, 88px) clamp(32px, 6vw, 96px);
}

.catalogLab-heroCopy > p {
  color: var(--brand-orange-bright);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.catalogLab-heroCopy h1 {
  max-width: 11ch;
  margin: 22px 0 18px;
  font-family: var(--font-display);
  font-size: clamp(58px, 6.2vw, 100px);
  line-height: 0.98;
  letter-spacing: -0.055em;
}

.catalogLab-heroCopy > span {
  max-width: 28ch;
  color: #b8b7b2;
  font-size: clamp(16px, 1.5vw, 20px);
  line-height: 1.75;
}

.catalogLab-heroActions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

.catalogLab-heroActions a {
  display: inline-flex;
  min-height: 44px;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  color: #171512;
  background: var(--brand-orange-bright);
  border: 1px solid var(--brand-orange-bright);
  font-size: 12px;
  font-weight: 850;
}

.catalogLab-heroActions a:last-child {
  color: #eeece7;
  background: transparent;
  border-color: #575751;
}

.catalogLab-heroActions a:hover,
.catalogLab-heroActions a:focus-visible {
  color: #171512;
  background: #fff;
  border-color: #fff;
}

.catalogLab-heroVisual {
  position: relative;
  min-height: 380px;
  margin: 0;
  overflow: hidden;
  background: #dedbd4;
}

.catalogLab-heroVisual::after {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
  background: linear-gradient(180deg, transparent 48%, rgb(17 17 15 / 84%));
}

.catalogLab-heroVisual img {
  width: 100%;
  height: 100%;
  padding: clamp(38px, 6vw, 96px);
  object-fit: contain;
}

.catalogLab-mediaPlaceholder {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: inherit;
  place-content: center;
  gap: 8px;
  padding: 24px;
  color: #d0cec7;
  text-align: center;
  background:
    radial-gradient(circle at 50% 42%, rgb(255 91 35 / 15%), transparent 34%),
    repeating-linear-gradient(135deg, #242421 0 1px, transparent 1px 16px),
    #1c1c1a;
}

.catalogLab-mediaPlaceholder span {
  color: var(--brand-orange-bright);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.catalogLab-mediaPlaceholder strong {
  font-size: clamp(18px, 2vw, 28px);
}

.catalogLab-mediaPlaceholder small {
  color: #888781;
  font-size: 12px;
}

.catalogLab-heroVisual figcaption {
  position: absolute;
  z-index: 1;
  right: clamp(24px, 4vw, 64px);
  bottom: clamp(26px, 4vw, 58px);
  left: clamp(24px, 4vw, 64px);
  display: grid;
  gap: 7px;
}

.catalogLab-heroVisual figcaption span,
.catalogLab-heroVisual figcaption small {
  color: #c5c3bd;
  font-size: 12px;
}

.catalogLab-heroVisual figcaption strong {
  max-width: 28ch;
  font-size: clamp(20px, 2.2vw, 32px);
  line-height: 1.2;
}

.catalogLab-heroFilters.catalogLab-filterDesktop {
  display: block;
  grid-column: 1 / -1;
  padding: 0 var(--page-gutter);
  background: #151513;
}

.catalogLab-heroFilters .catalogLab-filters {
  position: relative;
  top: auto;
  margin: 0;
  box-shadow: none;
}

.catalogLab-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 0 var(--page-gutter);
  border-bottom: 1px solid rgb(255 255 255 / 13%);
}

.catalogLab-metrics article {
  min-width: 0;
  padding: 22px clamp(18px, 3vw, 38px);
  border-right: 1px solid rgb(255 255 255 / 13%);
}

.catalogLab-metrics article:first-child {
  border-left: 1px solid rgb(255 255 255 / 13%);
}

.catalogLab-metrics strong,
.catalogLab-metrics span {
  display: block;
}

.catalogLab-metrics strong {
  color: var(--brand-orange-bright);
  font-family: var(--font-display);
  font-size: clamp(30px, 3vw, 46px);
  line-height: 1;
  letter-spacing: -0.04em;
}

.catalogLab-metrics span {
  margin-top: 8px;
  color: #aaa9a4;
  font-size: 13px;
}

.catalogLab-catalog {
  max-width: 1800px;
  margin: auto;
  padding: clamp(48px, 6vw, 88px) var(--page-gutter) 140px;
}

.catalogLab-catalogHeader,
.catalogLab-variants > header,
.catalogLab-attributeSection > header {
  max-width: 760px;
}

.catalogLab-catalogHeader h2,
.catalogLab-variants h2,
.catalogLab-attributeSection h2,
.catalogLab-sourceBoundary h2 {
  font-family: var(--font-display);
  font-size: clamp(42px, 5vw, 76px);
  line-height: 1;
  letter-spacing: -0.05em;
}

.catalogLab-catalogHeader p,
.catalogLab-variants header p,
.catalogLab-attributeSection header p,
.catalogLab-sourceBoundary p {
  max-width: 56ch;
  margin-top: 22px;
  color: #aaa9a4;
  font-size: 15px;
  line-height: 1.8;
}

.catalogLab-scopeControl {
  display: grid;
  grid-template-columns: minmax(280px, 0.72fr) minmax(0, 1.28fr);
  gap: 1px;
  max-width: 980px;
  margin-top: 34px;
  background: #4b4b46;
  border: 1px solid #4b4b46;
}

.catalogLab-scopeControl > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
}

.catalogLab-scopeControl button {
  display: grid;
  min-width: 0;
  min-height: 64px;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  color: #c9c7c0;
  background: #20201e;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.catalogLab-scopeControl button strong {
  color: var(--brand-orange-bright);
  font-family: var(--font-display);
  font-size: 25px;
  line-height: 1;
}

.catalogLab-scopeControl button span {
  min-width: 0;
  font-size: 12px;
  font-weight: 850;
  overflow-wrap: anywhere;
}

.catalogLab-scopeControl button[aria-pressed="true"] {
  color: #171512;
  background: var(--brand-orange-bright);
}

.catalogLab-scopeControl button[aria-pressed="true"] strong {
  color: #171512;
}

.catalogLab-scopeControl button:disabled {
  cursor: progress;
  opacity: 0.72;
}

.catalogLab-scopeControl > p {
  display: flex;
  min-width: 0;
  min-height: 64px;
  align-items: center;
  padding: 14px 18px;
  color: #aaa9a4;
  background: #1b1b19;
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.catalogLab-scopeControl > p[data-state="loading"] {
  color: #e2dfd7;
}

.catalogLab-scopeControl > p[data-state="error"] {
  color: #ffb18c;
  box-shadow: inset 3px 0 0 #ff6a27;
}

.catalogLab-facetDesktop {
  margin: 32px 0 58px;
}

.catalogLab-facetFilters {
  color: #d6d3cc;
  background: #43433f;
  border: 1px solid #43433f;
}

.catalogLab-facetFilters > header {
  display: flex;
  gap: 24px;
  align-items: baseline;
  justify-content: space-between;
  padding: 16px 18px;
  background: #1b1b19;
  border-bottom: 1px solid #43433f;
}

.catalogLab-facetFilters > header strong {
  color: var(--brand-orange-bright);
  font-size: 13px;
  font-weight: 900;
}

.catalogLab-facetFilters > header span {
  color: #92918b;
  font-size: 12px;
}

.catalogLab-facetFilters > div {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
}

.catalogLab-facetFilters label {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 14px 16px;
  color: #aaa9a4;
  background: #1b1b19;
  font-size: 12px;
}

.catalogLab-facetFilters select {
  width: 100%;
  min-height: 44px;
  padding: 9px 12px;
  color: #f1efea;
  background: #242421;
  border: 1px solid #51514c;
  font-size: 14px;
}

.catalogLab-facetFilters select:focus {
  border-color: var(--brand-orange-bright);
  outline: 2px solid rgb(224 87 23 / 38%);
  outline-offset: 0;
}

.catalogLab-activeConditions {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  margin-top: 12px;
  padding: 14px;
  color: #c9c7c0;
  background: #1b1b19;
  border: 1px solid #4b4b46;
}

.catalogLab-activeConditions > div {
  display: grid;
  gap: 3px;
  padding: 7px 4px;
}

.catalogLab-activeConditions > div strong {
  color: #ece9e2;
  font-size: 12px;
}

.catalogLab-activeConditions > div span {
  color: var(--brand-orange-bright);
  font-size: 11px;
  font-weight: 800;
}

.catalogLab-activeConditions ul {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 7px;
}

.catalogLab-activeConditions li {
  display: grid;
  grid-template-columns: auto minmax(0, auto) auto;
  min-width: 0;
  align-items: center;
  background: #292926;
  border: 1px solid #55554f;
}

.catalogLab-activeConditions li > span,
.catalogLab-activeConditions li > strong {
  padding: 8px 0 8px 10px;
  font-size: 12px;
}

.catalogLab-activeConditions li > span {
  color: #8f8e88;
}

.catalogLab-activeConditions li > strong {
  max-width: 240px;
  overflow: hidden;
  color: #ece9e2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalogLab-activeConditions button {
  min-height: 40px;
  padding: 8px 11px;
  color: #cbc9c3;
  background: #242421;
  border: 1px solid #55554f;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.catalogLab-activeConditions li button {
  margin: -1px -1px -1px 10px;
  color: var(--brand-orange-bright);
}

.catalogLab-filters {
  position: sticky;
  z-index: 20;
  top: var(--header-offset);
  display: grid;
  grid-template-columns: minmax(280px, 1.5fr) minmax(190px, 0.7fr) minmax(190px, 0.7fr) 120px;
  gap: 1px;
  margin: 30px 0 58px;
  background: #43433f;
  border: 1px solid #43433f;
  box-shadow: 0 18px 44px rgb(5 5 4 / 28%);
}

.catalogLab-filterDesktop {
  display: contents;
}

.catalogLab-filterToggle,
.catalogLab-filterDialog {
  display: none;
}

.catalogLab-filters label {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 14px 16px;
  color: #aaa9a4;
  background: #1b1b19;
  font-size: 12px;
}

.catalogLab-filters input,
.catalogLab-filters select {
  width: 100%;
  min-height: 44px;
  color: #f1efea;
  background: #242421;
  border: 1px solid #51514c;
  padding: 9px 12px;
  font-size: 14px;
}

.catalogLab-filters input::placeholder {
  color: #96958f;
}

.catalogLab-filters input:focus,
.catalogLab-filters select:focus {
  border-color: var(--brand-orange-bright);
  outline: 2px solid rgb(224 87 23 / 38%);
  outline-offset: 0;
}

.catalogLab-filters input:disabled,
.catalogLab-filters select:disabled,
.catalogLab-facetFilters select:disabled {
  color: #aaa9a4;
  background: #2b2b28;
  cursor: progress;
  opacity: 0.78;
}

.catalogLab-resultCount {
  display: grid;
  place-content: center;
  color: #aaa9a4;
  background: #1b1b19;
  text-align: center;
}

.catalogLab-resultCount strong {
  color: var(--brand-orange-bright);
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 1;
}

.catalogLab-resultCount span {
  margin-top: 5px;
  font-size: 12px;
}

.catalogLab-productGrid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: clamp(24px, 3vw, 48px) 18px;
  scroll-margin-top: calc(var(--header-offset) + 24px);
}

.catalogLab-productCard {
  grid-column: span 5;
  position: relative;
  min-width: 0;
  border-top: 1px solid #4d4d48;
}

.catalogLab-productCard[data-compared="true"] {
  border-color: var(--brand-orange-bright);
}

.catalogLab-productCardLink {
  display: block;
  transition:
    color var(--duration-fast) ease,
    transform var(--duration-ui) var(--ease-enter);
}

.catalogLab-productCard:nth-child(4n + 1),
.catalogLab-productCard:nth-child(4n + 4) {
  grid-column: span 7;
}

.catalogLab-productCard figure {
  aspect-ratio: 1.22;
  margin: 14px 0 0;
  overflow: hidden;
  background: #dedbd4;
}

.catalogLab-productCard:nth-child(4n + 2) figure,
.catalogLab-productCard:nth-child(4n + 3) figure {
  aspect-ratio: 0.96;
}

.catalogLab-productCard img {
  width: 100%;
  height: 100%;
  padding: clamp(18px, 3vw, 48px);
  object-fit: contain;
  transition: transform 800ms var(--ease-enter);
}

.catalogLab-productCardLink > div {
  padding: 22px 0 12px;
}

.catalogLab-productCard p {
  color: var(--brand-orange-bright);
  font-size: 12px;
  font-weight: 800;
}

.catalogLab-productCard h3 {
  max-width: 28ch;
  margin-top: 11px;
  font-size: clamp(19px, 1.7vw, 27px);
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.catalogLab-productCard dl {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin: 20px 0;
}

.catalogLab-productCard dl > div {
  display: grid;
  gap: 3px;
}

.catalogLab-productCard dt {
  color: #85857f;
  font-size: 11px;
}

.catalogLab-productCard dd {
  margin: 0;
  color: #c8c6c0;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.catalogLab-productCard dd[data-pending="true"] {
  color: #999892;
  font-style: italic;
}

.catalogLab-cardSpecs {
  display: grid;
  gap: 1px;
  margin: 0 0 20px;
  background: #43433f;
  border: 1px solid #43433f;
}

.catalogLab-cardSpecs li {
  display: grid;
  grid-template-columns: minmax(72px, 0.35fr) minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  padding: 9px 11px;
  color: #c8c6c0;
  background: #20201e;
  font-size: 11px;
}

.catalogLab-cardSpecs li > span {
  color: #898983;
}

.catalogLab-cardSpecs li > strong {
  min-width: 0;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.catalogLab-cardSpecsPending {
  margin: 0 0 20px;
  color: #85857f !important;
  font-size: 11px !important;
  font-style: italic;
}

.catalogLab-scopeStage {
  display: grid;
  min-height: 360px;
  place-content: center;
  justify-items: center;
  padding: 48px 20px;
  border-block: 1px solid #4d4d48;
  text-align: center;
}

.catalogLab-scopeStage > span {
  width: 42px;
  height: 42px;
  margin-bottom: 24px;
  border: 2px solid #55554f;
  border-top-color: var(--brand-orange-bright);
  border-radius: 50%;
  animation: catalog-scope-spin 800ms linear infinite;
}

.catalogLab-scopeStage h3 {
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 52px);
  letter-spacing: -0.04em;
}

.catalogLab-scopeStage p {
  max-width: 50ch;
  margin-top: 14px;
  color: #aaa9a4;
  font-size: 13px;
  line-height: 1.7;
}

@keyframes catalog-scope-spin {
  to {
    transform: rotate(360deg);
  }
}

.catalogLab-productCardLink > div > span {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  color: #c8c6c0;
  border-bottom: 1px solid #686862;
  font-size: 13px;
  font-weight: 700;
}

.catalogLab-compareToggle {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding: 8px 12px;
  color: #cbc9c3;
  background: transparent;
  border: 1px solid #5c5c57;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.catalogLab-compareToggle[aria-pressed="true"] {
  color: #171512;
  background: var(--brand-orange-bright);
  border-color: var(--brand-orange-bright);
}

.catalogLab-compareToggle[aria-disabled="true"]:not([aria-pressed="true"]) {
  color: #7f7e78;
  border-style: dashed;
}

@media (hover: hover) {
  .catalogLab-productCardLink:hover,
  .catalogLab-productCardLink:focus-visible {
    color: var(--brand-orange-bright);
    transform: translateY(-4px);
  }

  .catalogLab-productCardLink:hover img,
  .catalogLab-productCardLink:focus-visible img {
    transform: scale(1.035);
  }
}

.catalogLab-emptyState button,
.catalogLab-errorPage button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 180px;
  min-height: 48px;
  padding: 12px 20px;
  color: #151513;
  background: var(--brand-orange-bright);
  font-weight: 800;
  cursor: pointer;
}

.catalogLab-comparePanel {
  position: relative;
  z-index: 21;
  margin-top: clamp(58px, 7vw, 96px);
  background: #1b1b19;
  border: 1px solid #4b4b46;
  box-shadow: 0 24px 70px rgb(4 4 3 / 28%);
  scroll-margin-top: calc(var(--header-offset) + 24px);
}

.catalogLab-comparePanel > header {
  display: flex;
  gap: 28px;
  align-items: flex-end;
  justify-content: space-between;
  padding: clamp(24px, 4vw, 46px);
  border-bottom: 1px solid #4b4b46;
}

.catalogLab-comparePanel > header p {
  color: var(--brand-orange-bright);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.catalogLab-comparePanel > header h3 {
  max-width: 26ch;
  margin-top: 10px;
  font-family: var(--font-display);
  font-size: clamp(30px, 3vw, 48px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.catalogLab-comparePanel > header > div:last-child {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.catalogLab-comparePanel button {
  min-height: 44px;
  padding: 9px 13px;
  color: #d3d0c9;
  background: #292926;
  border: 1px solid #55554f;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.catalogLab-compareScroller {
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}

.catalogLab-comparePanel table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  table-layout: fixed;
}

.catalogLab-comparePanel th,
.catalogLab-comparePanel td {
  min-width: 190px;
  padding: 18px;
  border-right: 1px solid #44443f;
  border-bottom: 1px solid #44443f;
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.catalogLab-comparePanel th:first-child {
  width: 130px;
  min-width: 130px;
  color: #999892;
  font-size: 12px;
}

.catalogLab-comparePanel thead th:not(:first-child) {
  color: #ece9e2;
  font-size: 14px;
  line-height: 1.45;
}

.catalogLab-comparePanel thead a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  text-decoration: underline;
  text-decoration-color: #64645e;
  text-underline-offset: 5px;
}

.catalogLab-compareProductHeading {
  display: grid;
  gap: 12px;
  justify-items: start;
}

.catalogLab-compareProductHeading button {
  min-height: 38px;
  padding: 7px 10px;
}

.catalogLab-comparePanel td {
  color: #c1bfb8;
  font-size: 13px;
  line-height: 1.65;
}

.catalogLab-comparePanel > div > footer {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 24px clamp(20px, 4vw, 46px);
}

.catalogLab-comparePanel > div > footer p {
  max-width: 58ch;
  color: #92918b;
  font-size: 12px;
  line-height: 1.6;
}

.catalogLab-comparePanel > div > footer a {
  display: inline-flex;
  min-height: 48px;
  flex: 0 0 auto;
  align-items: center;
  padding: 11px 16px;
  color: #171512;
  background: var(--brand-orange-bright);
  font-size: 13px;
  font-weight: 900;
}

.catalogLab-pagination {
  display: grid;
  grid-template-columns: minmax(120px, auto) 1fr minmax(120px, auto);
  gap: 18px;
  align-items: center;
  margin-top: 72px;
  padding-top: 28px;
  border-top: 1px solid #4b4b46;
}

.catalogLab-pagination > button,
.catalogLab-pagination ol button {
  min-width: 48px;
  min-height: 48px;
  padding: 10px 14px;
  color: #d4d1ca;
  background: transparent;
  border: 1px solid #55554f;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.catalogLab-pagination > button:disabled {
  color: #6d6c67;
  cursor: not-allowed;
}

.catalogLab-pagination ol {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  justify-content: center;
}

.catalogLab-pagination ol span {
  display: grid;
  width: 34px;
  min-height: 48px;
  place-items: center;
  color: #7d7c76;
}

.catalogLab-pagination ol button[aria-current="page"] {
  color: #171512;
  background: var(--brand-orange-bright);
  border-color: var(--brand-orange-bright);
}

.catalogLab-pagination > p {
  grid-column: 1 / -1;
  color: #92918b;
  font-size: 12px;
  text-align: center;
}

.catalogLab-filterToggle:focus-visible,
.catalogLab-scopeControl button:focus-visible,
.catalogLab-filterDialog button:focus-visible,
.catalogLab-activeConditions button:focus-visible,
.catalogLab-compareToggle:focus-visible,
.catalogLab-comparePanel button:focus-visible,
.catalogLab-comparePanel a:focus-visible,
.catalogLab-pagination button:focus-visible,
.catalogLab-detailActions a:focus-visible,
.catalogLab-mediaControls button:focus-visible {
  outline: 2px solid var(--brand-orange-bright);
  outline-offset: 3px;
}

.catalogLab-emptyState button:active,
.catalogLab-errorPage button:active,
.catalogLab-variantSelector button:active,
.catalogLab-mediaControls button:active {
  transform: translateY(1px);
}

.catalogLab-emptyState {
  display: grid;
  justify-items: start;
  max-width: 680px;
  padding: 72px 0;
  border-top: 1px solid #4d4d48;
}

.catalogLab-emptyState h3 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4vw, 58px);
  letter-spacing: -0.04em;
}

.catalogLab-emptyState p {
  margin: 16px 0 28px;
  color: #aaa9a4;
}

.catalogLab-detailHero {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(480px, 0.88fr);
  min-height: min(940px, 100dvh);
  padding-top: var(--header-offset);
  border-bottom: 1px solid rgb(255 255 255 / 13%);
}

.catalogLab-evidenceStage {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 700px;
  margin: 0;
  background: #10100f;
  border-right: 1px solid rgb(255 255 255 / 13%);
}

.catalogLab-evidenceViewport {
  position: relative;
  isolation: isolate;
  display: grid;
  min-height: 600px;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 19% 78%, rgb(255 76 24 / 20%), transparent 31%),
    radial-gradient(circle at 76% 24%, rgb(209 215 218 / 11%), transparent 27%),
    #10100f;
}

.catalogLab-evidenceViewport::after {
  position: absolute;
  z-index: 2;
  inset: 0;
  content: "";
  pointer-events: none;
  background: linear-gradient(180deg, rgb(10 10 9 / 5%), transparent 48%, rgb(10 10 9 / 28%));
}

.catalogLab-evidenceImageFrame {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(76%, 760px);
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  background: #dedbd4;
  box-shadow:
    0 32px 90px rgb(0 0 0 / 42%),
    0 0 0 1px rgb(255 255 255 / 11%);
}

.catalogLab-evidenceImageFrame > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

@media (prefers-reduced-motion: no-preference) {
  .catalogLab-evidenceImageFrame > img {
    animation: catalog-media-swap 240ms var(--ease-enter) both;
  }
}

@keyframes catalog-media-swap {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.catalogLab-evidenceStage > figcaption {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: minmax(190px, 0.58fr) minmax(0, 1.42fr);
  gap: 18px;
  align-items: center;
  padding: 20px clamp(22px, 2vw, 32px) 22px;
  background: #171715;
  border-top: 1px solid #44443f;
}

.catalogLab-evidenceStage > figcaption > div:first-child {
  display: grid;
  gap: 7px;
}

.catalogLab-evidenceStage > figcaption strong {
  color: #ece9e2;
  font-size: 13px;
}

.catalogLab-evidenceStage > figcaption span {
  max-width: 47ch;
  color: #96958f;
  font-size: 11px;
  line-height: 1.65;
}

.catalogLab-mediaControls {
  display: flex;
  gap: 1px;
  min-width: 0;
  overflow-x: auto;
  background: #4a4a45;
  border: 1px solid #4a4a45;
  scrollbar-width: thin;
}

.catalogLab-mediaControls button {
  flex: 0 0 auto;
  min-width: 74px;
  min-height: 46px;
  padding: 10px 13px;
  color: #c4c2bc;
  background: #20201e;
  border: 0;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition:
    color var(--duration-fast) ease,
    background var(--duration-fast) ease,
    transform var(--duration-fast) ease;
}

.catalogLab-mediaControls button[aria-current="true"] {
  color: #171512;
  background: var(--brand-orange-bright);
}

.catalogLab-detailSummary {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: clamp(54px, 6vw, 94px);
}

.catalogLab-detailSummary nav {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  color: #aaa9a4;
  font-size: 12px;
}

.catalogLab-detailSummary nav a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
}

.catalogLab-detailSummary > p {
  margin: 24px 0 12px;
  color: var(--brand-orange-bright);
  font-size: 12px;
  font-weight: 800;
}

.catalogLab-detailSummary h1 {
  max-width: 20ch;
  font-family: var(--font-display);
  font-size: clamp(42px, 3.6vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.05em;
  overflow-wrap: anywhere;
}

.catalogLab-detailSummary > span {
  max-width: 52ch;
  margin-top: 24px;
  color: #aaa9a4;
  font-size: 15px;
  line-height: 1.8;
}

.catalogLab-familyFacts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 34px;
  border-top: 1px solid #4d4d48;
  border-left: 1px solid #4d4d48;
}

.catalogLab-familyFacts > div {
  padding: 18px;
  border-right: 1px solid #4d4d48;
  border-bottom: 1px solid #4d4d48;
}

.catalogLab-familyFacts dt {
  color: #85857f;
  font-size: 12px;
}

.catalogLab-familyFacts dd {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.catalogLab-detailActions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 26px;
}

.catalogLab-detailActions a {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 11px 16px;
  border: 1px solid #5c5c57;
  font-size: 13px;
  font-weight: 850;
}

.catalogLab-detailActions a:first-child {
  gap: 24px;
  color: #171512;
  background: var(--brand-orange-bright);
  border-color: var(--brand-orange-bright);
}

.catalogLab-detailActions small {
  flex-basis: 100%;
  color: #85857f;
  font-size: 11px;
}

.catalogLab-variants,
.catalogLab-attributeSection,
.catalogLab-sourceBoundary {
  max-width: 1800px;
  margin: auto;
  padding: clamp(88px, 9vw, 140px) var(--page-gutter);
  border-bottom: 1px solid rgb(255 255 255 / 13%);
}

.catalogLab-variantSelector {
  display: flex;
  gap: 1px;
  margin: 50px 0 24px;
  overflow-x: auto;
  background: #454540;
  border: 1px solid #454540;
  scroll-snap-type: x mandatory;
}

.catalogLab-variantSelector button {
  display: grid;
  flex: 0 0 min(340px, 82vw);
  gap: 8px;
  min-height: 128px;
  padding: 22px;
  color: #c8c6c0;
  background: #1b1b19;
  text-align: left;
  cursor: pointer;
  scroll-snap-align: start;
  transition:
    color var(--duration-fast) ease,
    background var(--duration-fast) ease;
}

.catalogLab-variantSelector button[aria-pressed="true"] {
  color: #171512;
  background: var(--brand-orange-bright);
}

.catalogLab-variantSelector button span {
  font-size: 12px;
  font-weight: 800;
}

.catalogLab-variantSelector button strong {
  font-size: 15px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.catalogLab-variantPanel {
  display: grid;
  grid-template-columns: minmax(230px, 0.55fr) minmax(0, 1.45fr);
  gap: 1px;
  background: #454540;
  border: 1px solid #454540;
}

.catalogLab-variantPanel > div,
.catalogLab-variantPanel > dl,
.catalogLab-variantPanel > p,
.catalogLab-variantPanel > ul {
  background: #1b1b19;
}

.catalogLab-variantPanel > div {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 28px;
}

.catalogLab-variantPanel > div span,
.catalogLab-variantPanel > div small {
  color: #85857f;
  font-size: 12px;
}

.catalogLab-variantPanel > div strong {
  font-size: 19px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.catalogLab-variantPanel dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
}

.catalogLab-variantPanel dl > div {
  min-height: 138px;
  padding: 24px;
  border-right: 1px solid #454540;
  border-bottom: 1px solid #454540;
}

.catalogLab-variantPanel dt,
.catalogLab-variantPanel dd,
.catalogLab-variantPanel dd small {
  display: block;
}

.catalogLab-variantPanel dt,
.catalogLab-variantPanel dd small {
  color: #85857f;
  font-size: 11px;
}

.catalogLab-variantPanel dd {
  margin: 12px 0;
  font-size: 18px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.catalogLab-variantPanel > p {
  min-height: 170px;
  padding: 30px;
  color: #aaa9a4;
  line-height: 1.8;
}

.catalogLab-variantPanel > ul {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px 28px;
  border-top: 1px solid #454540;
}

.catalogLab-variantPanel > ul li {
  padding: 8px 10px;
  color: #d7d4cd;
  background: #2a2a27;
  font-size: 12px;
}

.catalogLab-attributeSection dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 1px;
  margin-top: 52px;
  background: #454540;
  border: 1px solid #454540;
}

.catalogLab-attributeSection dl > div {
  min-height: 150px;
  padding: 26px;
  background: #1b1b19;
}

.catalogLab-attributeSection dt {
  color: var(--brand-orange-bright);
  font-size: 12px;
  font-weight: 800;
}

.catalogLab-attributeSection dd {
  margin: 18px 0 0;
  color: #d7d4cd;
  font-size: clamp(17px, 1.5vw, 22px);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.catalogLab-inlineEmpty {
  margin-top: 48px;
  padding: 42px;
  color: #aaa9a4;
  background: #1b1b19;
  border: 1px solid #454540;
}

.catalogLab-sourceBoundary {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(360px, 1.2fr);
  gap: clamp(48px, 8vw, 130px);
}

.catalogLab-sourceBoundary a {
  display: inline-flex;
  align-items: center;
  min-height: 46px;
  margin-top: 30px;
  color: var(--brand-orange-bright);
  border-bottom: 1px solid var(--brand-orange-bright);
  font-weight: 800;
}

.catalogLab-sourceBoundary details {
  align-self: start;
  border-top: 1px solid #4d4d48;
}

.catalogLab-sourceBoundary summary {
  display: flex;
  min-height: 64px;
  align-items: center;
  cursor: pointer;
  font-weight: 800;
}

.catalogLab-sourceBoundary ul {
  display: grid;
  gap: 1px;
  background: #454540;
  border: 1px solid #454540;
}

.catalogLab-sourceBoundary li {
  display: grid;
  gap: 5px;
  padding: 18px;
  background: #1b1b19;
}

.catalogLab-sourceBoundary li strong {
  color: var(--brand-orange-bright);
  font-size: 12px;
}

.catalogLab-sourceBoundary li span {
  color: #aaa9a4;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.catalogLab-loadingPage {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 1px;
  min-height: 100dvh;
  padding-top: var(--header-offset);
  background: #454540;
}

.catalogLab-loadingCopy,
.catalogLab-loadingVisual {
  background: #1b1b19;
}

.catalogLab-loadingCopy {
  margin: 12vw 8vw;
  height: 220px;
}

.catalogLab-loadingVisual {
  min-height: 640px;
}

.catalogLab-errorPage {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: calc(var(--header-offset) + 64px) var(--page-gutter) 64px;
}

.catalogLab-errorPage > div {
  max-width: 720px;
}

.catalogLab-errorPage p {
  color: var(--brand-orange-bright);
  font-weight: 800;
}

.catalogLab-errorPage h1 {
  margin: 18px 0;
  font-family: var(--font-display);
  font-size: clamp(48px, 7vw, 88px);
  letter-spacing: -0.05em;
}

.catalogLab-errorPage span {
  display: block;
  margin-bottom: 28px;
  color: #aaa9a4;
}

@media (max-width: 900px) {
  .catalogLab-heroFilters.catalogLab-filterDesktop {
    display: none;
  }

  .catalogLab-facetDesktop {
    display: none;
  }

  .catalogLab-hero,
  .catalogLab-detailHero,
  .catalogLab-variantPanel,
  .catalogLab-sourceBoundary,
  .catalogLab-loadingPage {
    grid-template-columns: 1fr;
  }

  .catalogLab-hero {
    min-height: auto;
  }

  .catalogLab-heroCopy {
    min-height: 0;
    padding: calc(var(--header-offset) + 34px) 24px 42px;
  }

  .catalogLab-heroCopy h1 {
    font-size: clamp(48px, 15vw, 74px);
  }

  .catalogLab-heroVisual {
    display: none;
  }

  .catalogLab-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 24px;
  }

  .catalogLab-metrics article:nth-child(3) {
    border-left: 1px solid rgb(255 255 255 / 13%);
  }

  .catalogLab-metrics article {
    padding: 18px 14px;
  }

  .catalogLab-catalog,
  .catalogLab-variants,
  .catalogLab-attributeSection,
  .catalogLab-sourceBoundary {
    padding: 54px 24px 80px;
  }

  .catalogLab-scopeControl {
    grid-template-columns: 1fr;
    margin-top: 28px;
  }

  .catalogLab-scopeControl > p {
    min-height: 58px;
  }

  .catalogLab-scopeControl button {
    min-height: 76px;
    grid-template-columns: 1fr;
    gap: 6px;
    align-content: center;
  }

  .catalogLab-filterDesktop {
    display: none;
  }

  .catalogLab-filterToggle {
    position: relative;
    display: flex;
    width: 100%;
    min-height: 58px;
    gap: 18px;
    align-items: center;
    justify-content: space-between;
    margin: 24px 0 38px;
    padding: 13px 16px;
    color: #ece9e2;
    background: #242421;
    border: 1px solid #55554f;
    box-shadow: 0 16px 38px rgb(4 4 3 / 30%);
    text-align: left;
    cursor: pointer;
  }

  .catalogLab-hero > .catalogLab-filterToggle {
    width: calc(100% - 48px);
    margin: 0 24px 24px;
  }

  .catalogLab-filterToggle span {
    font-size: 14px;
    font-weight: 850;
  }

  .catalogLab-filterToggle strong {
    color: var(--brand-orange-bright);
    font-size: 12px;
  }

  .catalogLab-filterDialog[open] {
    position: fixed;
    inset: 0 0 0 auto;
    display: grid;
    width: min(430px, calc(100vw - 24px));
    max-width: none;
    height: 100dvh;
    max-height: none;
    grid-template-rows: auto minmax(0, 1fr) auto;
    margin: 0;
    padding: 0 0 env(safe-area-inset-bottom);
    overflow: hidden;
    color: #ece9e2;
    background: #171715;
    border: 0;
    border-left: 1px solid #575751;
    overscroll-behavior: contain;
  }

  .catalogLab-filterDialog::backdrop {
    background: rgb(5 5 4 / 76%);
    backdrop-filter: blur(8px);
  }

  .catalogLab-filterDialog > header {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 24px;
    border-bottom: 1px solid #464641;
  }

  .catalogLab-filterDialog > header p {
    color: var(--brand-orange-bright);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.09em;
  }

  .catalogLab-filterDialog > header h2 {
    margin-top: 8px;
    font-family: var(--font-display);
    font-size: 34px;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .catalogLab-filterDialog > header button {
    width: 46px;
    min-width: 46px;
    min-height: 46px;
    color: #ece9e2;
    background: #292926;
    border: 1px solid #55554f;
    font-size: 26px;
    cursor: pointer;
  }

  .catalogLab-filterDialogBody {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .catalogLab-filterDialog .catalogLab-filters {
    position: static;
    grid-template-columns: 1fr;
    align-content: start;
    margin: 0;
    background:
      radial-gradient(circle at 76% 82%, rgb(224 87 23 / 9%), transparent 34%),
      #171715;
    border: 0;
    box-shadow: none;
  }

  .catalogLab-filterDialog .catalogLab-facetFilters {
    margin: 1px 0 0;
    border-inline: 0;
  }

  .catalogLab-filterDialog .catalogLab-facetFilters > header {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
    padding: 20px 16px 14px;
  }

  .catalogLab-filterDialog .catalogLab-facetFilters > div {
    grid-template-columns: 1fr;
  }

  .catalogLab-filterDialog .catalogLab-activeConditions {
    grid-template-columns: 1fr;
    margin: 1px 0 0;
    border-inline: 0;
  }

  .catalogLab-filterDialog .catalogLab-activeConditions ul {
    display: grid;
  }

  .catalogLab-filterDialog .catalogLab-activeConditions li {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .catalogLab-filterDialog .catalogLab-activeConditions li > strong {
    max-width: none;
  }

  .catalogLab-filterDialog .catalogLab-activeConditions > button {
    justify-self: stretch;
  }

  .catalogLab-filterDialog > footer {
    display: grid;
    grid-template-columns: 0.72fr 1.28fr;
    gap: 8px;
    padding: 14px 18px;
    background: #171715;
    border-top: 1px solid #464641;
  }

  .catalogLab-filterDialog > footer button {
    min-height: 48px;
    padding: 10px 12px;
    color: #d2d0c9;
    background: #292926;
    border: 1px solid #55554f;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }

  .catalogLab-filterDialog > footer button:last-child {
    color: #171512;
    background: var(--brand-orange-bright);
    border-color: var(--brand-orange-bright);
  }

  .catalogLab-resultCount {
    min-height: 72px;
  }

  .catalogLab-productGrid {
    grid-template-columns: 1fr;
    gap: 46px;
  }

  .catalogLab-productCard,
  .catalogLab-productCard:nth-child(4n + 1),
  .catalogLab-productCard:nth-child(4n + 4) {
    grid-column: auto;
  }

  .catalogLab-productCard figure,
  .catalogLab-productCard:nth-child(4n + 2) figure,
  .catalogLab-productCard:nth-child(4n + 3) figure {
    aspect-ratio: 1.1;
  }

  .catalogLab-comparePanel > header,
  .catalogLab-comparePanel > div > footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .catalogLab-comparePanel > header > div:last-child {
    justify-content: flex-start;
  }

  .catalogLab-comparePanel > div > footer a {
    width: 100%;
    justify-content: space-between;
  }

  .catalogLab-pagination {
    grid-template-columns: 1fr 1fr;
  }

  .catalogLab-pagination ol {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .catalogLab-pagination > p {
    grid-column: 1 / -1;
  }

  .catalogLab-detailHero {
    min-height: 0;
  }

  .catalogLab-evidenceStage {
    min-height: 0;
    border-right: 0;
    border-bottom: 1px solid rgb(255 255 255 / 13%);
  }

  .catalogLab-evidenceViewport {
    min-height: min(43svh, 420px);
  }

  .catalogLab-evidenceImageFrame {
    width: min(76vw, 40svh, 440px);
  }

  .catalogLab-evidenceStage > figcaption {
    grid-template-columns: 1fr;
    padding: 18px 24px 22px;
  }

  .catalogLab-detailSummary {
    padding: 32px 24px 72px;
  }

  .catalogLab-detailActions a {
    flex: 1 1 180px;
  }

  .catalogLab-familyFacts,
  .catalogLab-variantPanel dl {
    grid-template-columns: 1fr;
  }

  .catalogLab-variantPanel > ul {
    grid-column: auto;
  }

  .catalogLab-attributeSection dl {
    grid-template-columns: 1fr;
  }

  .catalogLab-attributeSection dl > div {
    min-height: 126px;
  }

  .catalogLab-loadingCopy {
    min-height: 220px;
  }

  .catalogLab-loadingVisual {
    min-height: 56svh;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .catalogLab-heroCopy,
  .catalogLab-heroVisual,
  .catalogLab-detailSummary,
  .catalogLab-evidenceStage {
    animation: catalog-enter 760ms var(--ease-enter) both;
  }

  .catalogLab-heroVisual,
  .catalogLab-detailSummary {
    animation-delay: 90ms;
  }
}

@keyframes catalog-enter {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .catalogLab-productCardLink,
  .catalogLab-productCard img,
  .catalogLab-variantSelector button,
  .catalogLab-mediaControls button {
    transition: none;
  }

  .catalogLab-scopeStage > span {
    animation: none;
  }
}
`;

export function GET() {
  return new Response(catalogLabCss, {
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
