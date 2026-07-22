"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import styles from "./EnglishExperience.module.css";

type Product = { slug: string; name: string; collection: string; image: string; note: string; type: "Pendant" | "Decorative" };

const products: Product[] = [
  { slug: "aurora-ring", name: "Aurora Ring", collection: "V-120116", image: "/en-assets/aurora-ring.webp", note: "Layered circular chandelier · visual collection", type: "Pendant" },
  { slug: "aurora-orbit", name: "Aurora Orbit", collection: "V-120116", image: "/en-assets/aurora-orbit.webp", note: "Compact multi-ring composition · visual collection", type: "Pendant" },
  { slug: "lumen-arc", name: "Lumen Arc", collection: "V-120118", image: "/en-assets/lumen-arc.webp", note: "Decorative pendant study · visual collection", type: "Decorative" },
  { slug: "lumen-detail", name: "Lumen Detail", collection: "V-120118", image: "/en-assets/lumen-detail.webp", note: "Decorative lighting detail · visual collection", type: "Decorative" },
  { slug: "halo-sculpture", name: "Halo Sculpture", collection: "V-120122", image: "/en-assets/halo-sculpture.webp", note: "Sculptural decorative light · visual collection", type: "Decorative" },
  { slug: "halo-line", name: "Halo Line", collection: "V-120122", image: "/en-assets/halo-line.webp", note: "Vertical decorative composition · visual collection", type: "Pendant" },
];

const resources = [
  { slug: "layered-light", category: "Design principles", title: "Layer light around the way a room is used", excerpt: "Ambient, task and accent light should answer different visual needs instead of competing for brightness.", points: ["Begin with movement and activities, not a fixture count.", "Give reading, preparation and mirror areas their own task light.", "Keep lighting layers independently controllable for everyday, hosting and night use."] },
  { slug: "smart-control", category: "Smart lighting", title: "Scenes are a system, not a switch", excerpt: "A lighting scene is the relationship between light quality, controls and the way people return to manual use.", points: ["Confirm drivers, protocol, gateway and dimming curve together.", "Test power recovery, network loss and physical control before handover.", "Keep device records, configuration backups and ownership clear."] },
  { slug: "commercial-light", category: "Commercial lighting", title: "Lighting a commercial space beyond the brightness target", excerpt: "Retail, hospitality and workspaces require a deliberate balance of visibility, comfort, colour and maintenance.", points: ["Define the activity and visual task before selecting optics.", "Review glare, reflection, beam direction and contrast in the real sightline.", "Treat controls, emergency requirements and access for maintenance as part of the design."] },
  { slug: "beam-angle", category: "Optics", title: "Use beam angle to compose attention", excerpt: "The relationship of beam, distance and surface decides whether a product, texture or path reads clearly.", points: ["Aim and observe from the viewer’s position, not only from the ceiling plan.", "Use focused light to create hierarchy rather than simply adding output.", "Check brightness contrast and avoid visible high-luminance sources in seated views."] },
  { slug: "dimming", category: "Controls", title: "Dimming compatibility needs a real test", excerpt: "Matching a brand name is not enough: drivers, control method and low-level behaviour must be checked as a system.", points: ["Identify phase-cut, 0/1–10 V, DALI or another specific control method.", "Test low-level flicker, synchronisation and scene transitions on site.", "Preserve a simple, physical fallback for basic lighting."] },
  { slug: "glare", category: "Visual comfort", title: "Glare control starts with the line of sight", excerpt: "Comfort comes from the relationship between source brightness, direction, reflections and the task being performed.", points: ["Review direct glare and reflected glare where people sit, work and look at screens.", "Balance the lit surface with its surrounding field of view.", "Use the right optical control before increasing intensity."] },
];

const pageTitles: Record<string, { kicker: string; title: string; body: string }> = {
  products: { kicker: "Collections", title: "Light objects with a point of view.", body: "A curated visual collection from the JUHAO knowledge base. Product information is shown only where it has been supplied; detailed specifications remain available on request." },
  projects: { kicker: "Projects", title: "Design begins with the way a space feels.", body: "Our project approach joins decorative expression, visual comfort and control logic into one readable lighting language." },
  solutions: { kicker: "Solutions", title: "Light for living, hospitality and commerce.", body: "One framework, adapted to the activity, material palette and visual task of every room." },
  "smart-home": { kicker: "Smart home", title: "Technology should leave the room feeling effortless.", body: "Scene control is designed around real routines, with a considered path back to simple physical control." },
  support: { kicker: "Service & support", title: "The details behind a lasting installation.", body: "From the early design conversation to system testing, our service process keeps every decision legible." },
  resources: { kicker: "Lighting notes", title: "A more useful way to talk about light.", body: "Practical reference notes distilled from the approved JUHAO professional lighting knowledge base." },
  about: { kicker: "JUHAO", title: "A brand built around the experience of light.", body: "The JUHAO SI system pairs a clear orange signature with quiet black, white, grey and gold—an identity designed to carry from object to space." },
  news: { kicker: "Journal", title: "Ideas that take shape in a room.", body: "Product stories, lighting thought and behind-the-scenes notes from the JUHAO team." },
  contact: { kicker: "Contact", title: "Start with the space you have in mind.", body: "Tell us the context, and we will begin with the questions that help a lighting conversation become specific." },
};

const nav = [
  ["Products", "/en/products"], ["Projects", "/en/projects"], ["Solutions", "/en/solutions"], ["Smart home", "/en/smart-home"], ["Resources", "/en/resources"], ["About", "/en/about"],
] as const;

function href(path: string) { return path; }
function Label({ children }: { children: React.ReactNode }) { return <p className={styles.label}>{children}</p>; }
function Arrow() { return <span aria-hidden="true">↗</span>; }

export function EnglishExperience({ slug = [] }: { slug?: string[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<"All" | Product["type"]>("All");
  const [sent, setSent] = useState(false);
  const page = slug[0] ?? "home";
  const detail = slug[1];
  const product = page === "products" && detail ? products.find((item) => item.slug === detail) : undefined;
  const resource = page === "resources" && detail ? resources.find((item) => item.slug === detail) : undefined;
  const visibleProducts = useMemo(() => filter === "All" ? products : products.filter((item) => item.type === filter), [filter]);
  const closeMenu = () => setMenuOpen(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSent(true); };

  return <div className={styles.site} lang="en">
    <header className={styles.header}>
      <Link href="/en" className={styles.logo} onClick={closeMenu} aria-label="JUHAO English home"><img src="/brand/juhao-logo-horizontal.svg" alt="JUHAO" /></Link>
      <button className={styles.menuButton} aria-expanded={menuOpen} aria-controls="en-nav" onClick={() => setMenuOpen((value) => !value)}><span /> <span /> <span className={styles.srOnly}>Menu</span></button>
      <nav id="en-nav" className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="English primary navigation">
        {nav.map(([label, path]) => <Link key={path} href={href(path)} onClick={closeMenu}>{label}</Link>)}
        <Link className={styles.navCta} href="/en/contact" onClick={closeMenu}>Start a project <Arrow /></Link>
      </nav>
    </header>
    <main>
      {page === "home" && <Home />}
      {product && <ProductDetail product={product} />}
      {resource && <ResourceDetail resource={resource} />}
      {!product && !resource && page !== "home" && <StandardPage page={page} products={visibleProducts} filter={filter} setFilter={setFilter} sent={sent} submit={submit} />}
    </main>
    <footer className={styles.footer}>
      <div><img src="/brand/juhao-logo-horizontal-white.svg" alt="JUHAO" /><p>Lighting for considered spaces.</p></div>
      <div className={styles.footerLinks}><Link href="/en/products">Collections</Link><Link href="/en/resources">Lighting notes</Link><Link href="/en/contact">Contact</Link><a href="/" lang="zh-CN">中文站</a></div>
      <p className={styles.footerFine}>Private English preview · Content uses approved lighting knowledge and locally supplied visual collections. © JUHAO</p>
    </footer>
  </div>;
}

function Home() {
  return <>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><Label>JUHAO · SMART HOME EXPERIENCE PAVILION</Label><h1>Light becomes part of the life around it.</h1><p>Decorative lighting, spatial atmosphere and intelligent control for homes and hospitality spaces with a point of view.</p><div className={styles.actions}><Link className={styles.primary} href="/en/products">Explore collections <Arrow /></Link><Link className={styles.textLink} href="/en/solutions">Our approach <Arrow /></Link></div></div>
      <div className={styles.heroVisual}><div className={styles.sun} /><img src="/en-assets/aurora-ring.webp" alt="JUHAO Aurora Ring decorative chandelier" /></div>
      <p className={styles.heroIndex}>01 / 03</p>
    </section>
    <section className={styles.intro}><Label>Designed in layers</Label><div><h2>Lighting that knows when to lead—and when to let a room speak.</h2><p>JUHAO brings together ambient, task and accent light so that a space works beautifully from the first arrival to the last quiet hour.</p><Link className={styles.textLink} href="/en/resources/layered-light">Read our lighting notes <Arrow /></Link></div></section>
    <section className={styles.collection}><div className={styles.sectionHead}><div><Label>Featured collection</Label><h2>Artful presence. Considered light.</h2></div><Link className={styles.textLink} href="/en/products">View all collections <Arrow /></Link></div><div className={styles.productGrid}>{products.slice(0, 3).map((item) => <ProductCard item={item} key={item.slug} />)}</div></section>
    <section className={styles.split}><div className={styles.splitImage}><img src="/en-assets/halo-line.webp" alt="JUHAO decorative light from V-120122 collection" /></div><div className={styles.splitCopy}><Label>Smart, in context</Label><h2>Scenes that fit the moment, not the other way around.</h2><p>Controls should hold the room together without making it harder to live in. We start with routines, then design a system that is graceful in use and resilient in everyday life.</p><Link className={styles.primary} href="/en/smart-home">Explore smart home <Arrow /></Link></div></section>
    <section className={styles.notes}><div><Label>From the knowledge base</Label><h2>Useful ideas, held lightly.</h2></div><div className={styles.notesList}>{resources.slice(0, 3).map((item, index) => <Link key={item.slug} href={`/en/resources/${item.slug}`} className={styles.note}><span>0{index + 1}</span><div><p>{item.category}</p><h3>{item.title}</h3></div><Arrow /></Link>)}</div></section>
    <section className={styles.closing}><Label>Begin a conversation</Label><h2>Bring us the room, the idea, or the question.</h2><Link className={styles.primary} href="/en/contact">Start a project <Arrow /></Link></section>
  </>;
}

function StandardPage({ page, products: pageProducts, filter, setFilter, sent, submit }: { page: string; products: Product[]; filter: "All" | Product["type"]; setFilter: (filter: "All" | Product["type"]) => void; sent: boolean; submit: (event: FormEvent<HTMLFormElement>) => void }) {
  const data = pageTitles[page];
  return <>
    <section className={styles.pageHero}><Label>{data.kicker}</Label><h1>{data.title}</h1><p>{data.body}</p></section>
    {page === "products" && <section className={styles.catalog}><div className={styles.filters}>{(["All", "Pendant", "Decorative"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? styles.active : ""}>{item}</button>)}</div><div className={styles.productGrid}>{pageProducts.map((item) => <ProductCard item={item} key={item.slug} />)}</div><p className={styles.disclaimer}>The V-120116, V-120118 and V-120122 visual collections in this preview are locally supplied image records. No unverified dimensions, output, materials, pricing or certification claims are presented.</p></section>}
    {page === "projects" && <ProjectModule />}
    {page === "solutions" && <SolutionModule />}
    {page === "smart-home" && <SmartModule />}
    {page === "support" && <SupportModule />}
    {page === "resources" && <ResourcesModule />}
    {page === "about" && <AboutModule />}
    {page === "news" && <NewsModule />}
    {page === "contact" && <ContactModule sent={sent} submit={submit} />}
  </>;
}

function ProductCard({ item }: { item: Product }) { return <Link href={`/en/products/${item.slug}`} className={styles.productCard}><div className={styles.productImage}><img src={item.image} alt={item.name} /></div><p>{item.type} · {item.collection}</p><h3>{item.name}</h3><span>{item.note}</span><b>Discover <Arrow /></b></Link>; }
function ProductDetail({ product }: { product: Product }) { return <><section className={styles.detail}><div className={styles.detailImage}><img src={product.image} alt={product.name} /></div><div><Label>{product.collection} · Visual collection</Label><h1>{product.name}</h1><p>{product.note}. This private preview respects the source record: detailed specifications, pricing, material claims and availability are not shown until confirmed.</p><Link className={styles.primary} href="/en/contact">Request collection information <Arrow /></Link></div></section><section className={styles.next}><Label>Continue exploring</Label><h2>See the collection in context.</h2><Link className={styles.textLink} href="/en/products">Back to all collections <Arrow /></Link></section></>; }
function ResourceDetail({ resource }: { resource: typeof resources[number] }) { return <article className={styles.article}><Link className={styles.back} href="/en/resources">← Back to lighting notes</Link><Label>{resource.category}</Label><h1>{resource.title}</h1><p className={styles.lead}>{resource.excerpt}</p><ol>{resource.points.map((point, index) => <li key={point}><span>0{index + 1}</span>{point}</li>)}</ol><aside><p>Source basis: approved JUHAO professional lighting knowledge base. This note provides practical guidance, not a universal product or performance claim.</p></aside></article>; }
function ProjectModule() { return <section className={styles.projectModule}><div className={styles.projectVisual}><img src="/en-assets/lumen-arc.webp" alt="Decorative pendant light" /></div><div><Label>Spatial narratives</Label><h2>Three expressions, one clear intention.</h2><div className={styles.projectList}><p><b>Residence</b><span>Layered light for arrival, gathering and rest.</span></p><p><b>Hospitality</b><span>Atmosphere that supports the rhythm of a stay.</span></p><p><b>Commercial</b><span>Attention, comfort and maintenance considered together.</span></p></div><Link className={styles.primary} href="/en/contact">Discuss a project <Arrow /></Link></div></section>; }
function SolutionModule() { return <section className={styles.solutionGrid}>{[["01", "Residential", "A home can move from a useful morning to a quiet evening without a new set of rules."], ["02", "Hospitality", "Light makes the first impression, then supports the guest experience in the background."], ["03", "Commercial", "Display, wayfinding, comfort and operations work better when planned together."]].map(([no, title, body]) => <article key={title}><span>{no}</span><h2>{title}</h2><p>{body}</p><Link href="/en/contact">Explore <Arrow /></Link></article>)}</section>; }
function SmartModule() { return <section className={styles.smartModule}><div><Label>Scene by scene</Label><h2>There is no intelligent light without a good light first.</h2><p>A useful system takes account of driver type, protocol, dimming quality, device records and a manual fallback—then makes it feel simple.</p><Link className={styles.primary} href="/en/resources/smart-control">Read the control note <Arrow /></Link></div><ol><li><span>01</span><b>Define routines</b><p>Start with moments in the room, not a list of devices.</p></li><li><span>02</span><b>Make compatibility explicit</b><p>Test drivers, controls and low-level behaviour together.</p></li><li><span>03</span><b>Keep control human</b><p>Give every space a graceful path back to physical control.</p></li></ol></section>; }
function SupportModule() { return <section className={styles.supportGrid}>{[["Design conversation", "Space use, visual priorities and lighting layers."], ["Collection guidance", "Source-verified product information and selection support."], ["System review", "Controls, dimming compatibility and handover considerations."], ["Aftercare", "Clear records for maintenance and future adjustment."]].map(([title, body]) => <article key={title}><span>+</span><h2>{title}</h2><p>{body}</p></article>)}</section>; }
function ResourcesModule() { return <section className={styles.resourceGrid}>{resources.map((item, index) => <Link href={`/en/resources/${item.slug}`} key={item.slug}><span>0{index + 1}</span><p>{item.category}</p><h2>{item.title}</h2><div><span>Read note</span><Arrow /></div></Link>)}</section>; }
function AboutModule() { return <><section className={styles.about}><div className={styles.orangePanel}><p>1505 CVC</p><span>JUHAO orange</span></div><div><Label>Identity, applied with restraint</Label><h2>Orange carries the signature. Space carries the story.</h2><p>The enterprise SI manual establishes JUHAO orange as the brand signal, supported by black, grey, gold and white. This English experience translates that system into a calm, architectural interface.</p></div></section><section className={styles.values}><p>Designed with clarity.</p><p>Made for lived spaces.</p><p>Built around the experience of light.</p></section></>; }
function NewsModule() { return <section className={styles.journal}>{[["Lighting notes", "A room is not a grid: why layered light starts with people."], ["Smart home", "The best scene is the one people do not have to think about."], ["Collections", "Visual studies from the V-120116, V-120118 and V-120122 archives."]].map((item, index) => <article key={item[1]}><span>0{index + 1}</span><p>{item[0]}</p><h2>{item[1]}</h2><Link href="/en/resources">Read more <Arrow /></Link></article>)}</section>; }
function ContactModule({ sent, submit }: { sent: boolean; submit: (event: FormEvent<HTMLFormElement>) => void }) { return <section className={styles.contact}><div><Label>Let’s begin</Label><h2>Describe the space in a few words.</h2><p>This owner-only preview keeps enquiries local to the interface. Live lead routing will be connected as part of the domain launch once the required DNS verification is complete.</p></div><form onSubmit={submit}>{sent ? <p className={styles.thanks}>Thank you. Your preview enquiry has been acknowledged.</p> : <><label>Your name<input required name="name" autoComplete="name" /></label><label>Email<input required type="email" name="email" autoComplete="email" /></label><label>Project context<textarea required name="message" rows={4} placeholder="Residence, hospitality, retail…" /></label><button className={styles.primary} type="submit">Send preview enquiry <Arrow /></button></>}</form></section>; }
