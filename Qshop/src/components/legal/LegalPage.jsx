// /terms and /privacy — the UniHive Terms & Conditions and Privacy Policy.
// Plain-language, versioned (LEGAL_VERSION) so users can be asked to accept
// changes. Replaces the old PDFs.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../Navbar';
import { LEGAL_UPDATED, CONTACT } from './legalVersion';

const S = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="font-serif text-xl sm:text-2xl font-bold mt-10 mb-3">{title}</h2>
    <div className="space-y-3 text-[15px] leading-relaxed text-foreground/80">{children}</div>
  </section>
);
const H = ({ children }) => <h3 className="font-semibold text-foreground mt-5">{children}</h3>;
const L = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
);

const Contact = () => (
  <L items={[
    <>WhatsApp: <a className="underline" href={`https://wa.me/254${CONTACT.whatsapp.slice(1)}`}>{CONTACT.whatsapp}</a></>,
    <>Instagram: <a className="underline" href={CONTACT.instagramUrl} target="_blank" rel="noreferrer">{CONTACT.instagram}</a> (DM)</>,
  ]} />
);

function Shell({ title, intro, toc, children }) {
  useEffect(() => { document.title = `${title} — UniHive`; window.scrollTo(0, 0); }, [title]);
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-24">
        <p className="text-xs uppercase tracking-[0.25em] text-foreground/50">UniHive · {CONTACT.company}</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mt-2">{title}</h1>
        <p className="text-sm text-foreground/55 mt-2">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-5 text-[15px] leading-relaxed text-foreground/80 space-y-3">{intro}</div>
        <nav aria-label="Contents" className="mt-8 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/50 mb-3">Contents</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm list-decimal pl-5">
            {toc.map(([id, t]) => <li key={id}><a href={`#${id}`} className="hover:underline">{t}</a></li>)}
          </ol>
        </nav>
        {children}
        <p className="mt-12 text-sm text-foreground/50">
          See also: <Link to="/terms" className="underline">Terms &amp; Conditions</Link> · <Link to="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </main>
    </>
  );
}

const TERMS_TOC = [
  ['about', 'About UniHive'], ['eligibility', 'Eligibility & accounts'], ['marketplace', 'Marketplace: goods & services'],
  ['payments', 'Payments, escrow & payouts'], ['messages', 'Messages & communication'], ['disputes', 'Disputes'],
  ['prohibited', 'Prohibited items & conduct'], ['events', 'Events, THE HIVE & tickets'], ['wallet', 'HIVE Wallet & redemptions'],
  ['partners', 'Partner brands'], ['media', 'Photos, videos & content'], ['fees', 'Fees'],
  ['liability', 'Liability & indemnity'], ['ip', 'Intellectual property'], ['termination', 'Suspension & termination'],
  ['changes', 'Changes to these Terms'], ['law', 'Governing law'], ['contact', 'Contact'],
];

export function TermsPage() {
  return (
    <Shell
      title="Terms & Conditions"
      toc={TERMS_TOC}
      intro={<>
        <p>These Terms govern your use of UniHive (the website at unihive.shop and related services), owned and operated by <strong>{CONTACT.company}</strong> (&ldquo;UniHive&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).</p>
        <p>By creating an account, signing in, or using UniHive you agree to these Terms and to our <Link to="/privacy" className="underline">Privacy Policy</Link>. If you don&rsquo;t agree, please don&rsquo;t use UniHive.</p>
      </>}
    >
      <S id="about" title="1. About UniHive">
        <p>UniHive connects people, creates opportunities and brings people together through experiences. It has three parts:</p>
        <L items={[
          <><strong>Goods</strong> — a marketplace where independent sellers list and sell products to buyers.</>,
          <><strong>The Buzz</strong> — services, events and experiences, including bookings with independent service providers.</>,
          <><strong>THE HIVE</strong> — UniHive&rsquo;s own events, where you can pre-order drinks, food, merchandise and experiences from UniHive and its partner brands.</>,
        ]} />
        <p>For marketplace goods and services, UniHive is a platform and payment intermediary: the sale is a contract between the buyer and the seller or provider. UniHive does not own, make, inspect, store or deliver sellers&rsquo; goods, and does not perform providers&rsquo; services.</p>
      </S>

      <S id="eligibility" title="2. Eligibility & accounts">
        <L items={[
          'You must be able to enter into a binding agreement. If you are under 18, you may use the marketplace only with the consent of a parent or legal guardian.',
          'Event entry, alcohol and any age-restricted item are strictly 18+. You may be asked for a valid ID at an event and refused service without one.',
          'The information you give us must be accurate and kept up to date. You are responsible for keeping your login details secure and for activity on your account.',
          'Some accounts have extra roles — seller, partner brand team member, event staff or administrator. These roles give access only to what is needed for that role and must not be used for anything else.',
          'We may suspend or close accounts that contain false or misleading information.',
        ]} />
      </S>

      <S id="marketplace" title="3. Marketplace: goods & services">
        <L items={[
          'Sellers and service providers are responsible for their listings: accurate descriptions, photos, prices, availability and lawful items. Mark sold-out items promptly.',
          'Buyers are responsible for reading listings, communicating with the seller and confirming delivery or completion.',
          'Delivery may be arranged directly with the seller or through a delivery partner such as PickUp Mtaani. Delivery partners have their own terms.',
          'By listing on UniHive, sellers allow us to display, share and promote their listing content (for example on the site, in link previews and on UniHive social media).',
        ]} />
      </S>

      <S id="payments" title="4. Payments, escrow & payouts">
        <L items={[
          'Payments are made through M-Pesa (Safaricom). An order is placed only when payment is received by UniHive.',
          'For marketplace orders, UniHive holds the payment until the buyer confirms receipt, or until a waiting period (currently up to 14 days after delivery) passes with no dispute raised. The seller is then paid, less any applicable fees.',
          'We may delay, withhold or reverse a payout where there is a dispute, suspected fraud, a breach of these Terms or a legal requirement.',
          'Always pay through UniHive. Payments made directly to a seller outside UniHive are not protected and we cannot help recover them.',
        ]} />
      </S>

      <S id="messages" title="5. Messages & communication">
        <p>UniHive provides messaging so buyers and sellers can arrange fulfilment. After an order, sellers must promptly communicate delivery arrangements and buyers should confirm payment and receipt. Messages are stored and may be reviewed by UniHive when a dispute is raised, fraud is suspected or the law requires it, and may be used as evidence. We are not responsible for losses caused by a failure to communicate through the tools provided.</p>
      </S>

      <S id="disputes" title="6. Disputes">
        <L items={[
          'Buyers must raise a dispute within 48 hours of placing the order or within 24 hours of receiving the goods, whichever is later. After that, payment may be released to the seller automatically.',
          'UniHive will review messages, order records and any evidence provided, and decide the outcome on the platform. This does not limit your rights under Kenyan law.',
        ]} />
      </S>

      <S id="prohibited" title="7. Prohibited items & conduct">
        <L items={[
          'No illegal, counterfeit, stolen or contraband goods; no items that require a licence the seller does not hold; no age-restricted items sold to minors.',
          'No fraud: non-delivery, misrepresentation, fake listings, fake reviews, abuse of disputes, or attempts to take payments off-platform.',
          'No harassment, hate, threats or impersonation — online or at our events. No scams, no stress, no exceptions.',
          'No attempts to break, overload, scrape or get around the security of UniHive.',
        ]} />
        <p>We may remove listings, freeze funds held on the platform, suspend or ban accounts, refuse event access, and report matters to the authorities.</p>
      </S>

      <S id="events" title="8. Events, THE HIVE & tickets">
        <L items={[
          <>Event admission tickets for THE HIVE are sold <strong>exclusively by Little Events</strong> (Little). Buying, transferring and refunding tickets is governed by Little&rsquo;s terms, and Little runs entry checks at the door. UniHive does not sell admission.</>,
          'You can claim a Little ticket on UniHive to link it to your account and unlock the HIVE Wallet and perks. You may only claim tickets that belong to you.',
          'Event details (line-up, times, venue, partners, offers) may change. We will update the event page when they do.',
          'At events: follow staff and venue instructions, drink responsibly, and respect other guests. We or the venue may refuse service or remove anyone who is intoxicated, unsafe, under age or breaking these Terms, without a refund from UniHive.',
          'Offers from partners (for example ride discount codes) are provided by those partners and are subject to their terms.',
        ]} />
      </S>

      <S id="wallet" title="9. HIVE Wallet & redemptions">
        <L items={[
          'The HIVE Wallet holds prepaid credit, topped up through M-Pesa, for spending on items sold for a specific event on UniHive. It is not a bank account and earns no interest.',
          'When you buy an item, you receive a QR code. Show it at the stand to collect your item; staff or partner-brand staff scan it once and it is marked redeemed. Keep your QR codes private — anyone holding a code may be able to redeem it.',
          'The rules for unused wallet balances and unredeemed items for each event — including any refund, carry-over or expiry — are shown on that event’s page. Where they are not shown, contact us and we will apply a fair outcome.',
          'Prices are shown in Kenya Shillings and are charged as shown at checkout. Alcohol is sold only to people aged 18 and over.',
        ]} />
      </S>

      <S id="partners" title="10. Partner brands">
        <p>Some items at UniHive events are supplied by partner brands. UniHive collects payment for these items and settles with partners under separate agreements. Partner-brand staff use UniHive tools to see sales of their own items and to scan and redeem QR codes at their stands. Partners must use these tools only for that purpose.</p>
      </S>

      <S id="media" title="11. Photos, videos & content">
        <L items={[
          'UniHive events are photographed and filmed. By attending, you agree that photos and videos in which you appear may be published on UniHive and its social media (for example in the Photo Booth and event recaps).',
          'If you would rather not appear, tell our photographers on the night, or contact us afterwards and we will remove published images of you within a reasonable time.',
          'Content you upload (listings, photos, banners, messages) remains yours. You give UniHive a non-exclusive, royalty-free licence to use it to run and promote UniHive. You confirm you have the right to upload it.',
        ]} />
      </S>

      <S id="fees" title="12. Fees">
        <p>UniHive may charge fees on completed marketplace sales and bookings. Fees may be paid by buyers, sellers or both, are shown or communicated before they apply, and may change with notice.</p>
      </S>

      <S id="liability" title="13. Liability & indemnity">
        <L items={[
          'UniHive is not responsible for the conduct of buyers, sellers, providers, partners or other guests; for the quality, safety or legality of third-party goods and services; for delivery failures by third parties; or for outages of third-party services (such as M-Pesa, Little or hosting providers).',
          'To the extent allowed by law, our total liability for any claim is limited to the value of the transaction in question, and we are not liable for indirect or consequential losses.',
          'You agree to cover UniHive and Nexalon Group Ltd for claims and losses that arise from your listings, content, conduct or breach of these Terms.',
          'Nothing in these Terms limits rights you have under Kenyan consumer protection law that cannot be excluded.',
        ]} />
      </S>

      <S id="ip" title="14. Intellectual property">
        <p>UniHive&rsquo;s name, logos, designs, software and content belong to Nexalon Group Ltd. Partner brands&rsquo; names and logos belong to their owners and are used with permission.</p>
      </S>

      <S id="termination" title="15. Suspension & termination">
        <p>You can stop using UniHive and ask us to close your account at any time. We may suspend or close accounts that break these Terms or the law. Sections on payments owed, disputes, liability, indemnity, data and governing law continue after an account closes.</p>
      </S>

      <S id="changes" title="16. Changes to these Terms">
        <p>We may update these Terms as UniHive grows. When we make important changes we will show the new version on UniHive and ask signed-in users to accept it before continuing. The date at the top shows the latest version.</p>
      </S>

      <S id="law" title="17. Governing law">
        <p>These Terms are governed by the laws of Kenya, and disputes are subject to the jurisdiction of the Kenyan courts.</p>
      </S>

      <S id="contact" title="18. Contact">
        <Contact />
      </S>
    </Shell>
  );
}

const PRIVACY_TOC = [
  ['who', 'Who we are'], ['collect', 'What we collect'], ['use', 'How we use it'], ['basis', 'Lawful basis & consent'],
  ['share', 'Who we share it with'], ['transfer', 'Where it is stored'], ['retention', 'How long we keep it'],
  ['security', 'How we protect it'], ['rights', 'Your rights'], ['minors', 'Under 18s'],
  ['device', 'Device storage & analytics'], ['breach', 'Data breaches'], ['changes', 'Changes'], ['contact', 'Contact'],
];

export function PrivacyPage() {
  return (
    <Shell
      title="Privacy Policy"
      toc={PRIVACY_TOC}
      intro={<>
        <p>This policy explains what personal data UniHive collects, why, who we share it with and the choices you have. We follow the <strong>Kenya Data Protection Act, 2019</strong>.</p>
        <p>We do not sell your personal data.</p>
      </>}
    >
      <S id="who" title="1. Who we are">
        <p>The data controller is <strong>{CONTACT.company}</strong>, which owns and operates UniHive, in Kenya. See <a href="#contact" className="underline">Contact</a> for how to reach us.</p>
      </S>

      <S id="collect" title="2. What we collect">
        <H>Account</H>
        <L items={[
          'Name, email address, phone number and password (stored only as a secure hash — we cannot see it).',
          'Optional: your location or shop location, and the account type you choose.',
          'If you sign in with Google: your name, email address and profile picture from Google.',
        ]} />
        <H>Selling</H>
        <L items={[
          'Shop name, banner, description, location, products, services, photos and prices.',
          'The M-Pesa number used for payouts.',
          'Optional identity documents you upload for verification (national ID, student ID or business documents). These are stored privately and used only for verification and fraud prevention.',
        ]} />
        <H>Buying & orders</H>
        <L items={[
          'Orders, items, amounts, M-Pesa phone number and receipt details, order and delivery status.',
          'Delivery details such as your chosen pickup point and the recipient name and phone number.',
          'Your cart, wishlist, the shops you follow and ratings you leave.',
          'Messages you send to other users on UniHive.',
        ]} />
        <H>Events & THE HIVE</H>
        <L items={[
          'Tickets you claim from Little Events, including the ticket details Little provides to us (such as ticket code, ticket type and the name, phone or email on the ticket) so we can match the ticket to you.',
          'HIVE Wallet top-ups, balance and purchases; the QR codes issued to you; and when, where and by which stand each code was redeemed.',
          'Votes in polls on the site.',
          'Photos and videos taken at our events (see Terms section 11).',
        ]} />
        <H>Technical</H>
        <L items={[
          'IP address, device and browser type, and security and error logs kept by our hosting providers.',
          'Aggregated, anonymous page-view statistics (see Device storage & analytics).',
        ]} />
        <p>We do not collect biometric data or track your precise device location, and we do not make automated decisions that have legal or similarly significant effects on you.</p>
      </S>

      <S id="use" title="3. How we use it">
        <L items={[
          'To create and run your account and keep it secure.',
          'To process payments, orders, bookings, payouts, deliveries, wallet purchases and redemptions.',
          'To let buyers and sellers communicate, and to resolve disputes and prevent fraud.',
          'To run events: matching your Little ticket, issuing and redeeming QR codes, and showing partner brands the sales of their own items.',
          'To send service messages — order and payment updates, account and security notices, and practical updates to sellers about their store (for example, preparing for busy periods).',
          'To understand how UniHive is used in aggregate so we can improve it.',
          'To meet legal, tax and regulatory obligations.',
        ]} />
        <p>We do not use your personal data for third-party advertising, and we do not sell or rent it. If we send promotional messages, you can ask us to stop at any time.</p>
      </S>

      <S id="basis" title="4. Lawful basis & consent">
        <L items={[
          <><strong>Contract</strong> — to provide the services you sign up for (account, orders, payments, events).</>,
          <><strong>Legitimate interests</strong> — fraud prevention, security, dispute resolution, and improving UniHive.</>,
          <><strong>Legal obligation</strong> — tax, accounting and lawful requests from authorities.</>,
          <><strong>Consent</strong> — optional items such as identity documents you choose to upload, poll votes, and appearing in published event photos. You can withdraw consent at any time; this does not affect anything done before you withdrew it.</>,
        ]} />
        <p>When you create an account or accept an updated version of this policy, we record the version you accepted and when.</p>
      </S>

      <S id="share" title="5. Who we share it with">
        <p>We share personal data only as needed to run UniHive:</p>
        <L items={[
          <><strong>Other users</strong> — buyers and sellers see the details needed to complete an order (for example name, phone number and delivery details). Your public shop and listings are visible to everyone.</>,
          <><strong>Partner brands</strong> — see the items sold and redeemed at their stands (item, quantity and time). When scanning a QR code, their staff see the buyer’s first name and initial to hand over the item. They do not see your phone number or email.</>,
          <><strong>Event staff</strong> — see the ticket or item being redeemed and the holder&rsquo;s name.</>,
          <><strong>Little Events</strong> — sells tickets and runs entry; we exchange ticket details with Little to link tickets to UniHive accounts. Little is responsible for the data you give Little directly.</>,
          <><strong>Service providers that process data for us</strong>: Supabase (database, sign-in and file storage), Vercel (website hosting and analytics), Render (application server), Safaricom M-Pesa (payments), Resend (email delivery), Google (Sign in with Google), and PickUp Mtaani (deliveries).</>,
          <><strong>Authorities</strong> — when required by law, or to protect the safety and rights of users and UniHive.</>,
        ]} />
      </S>

      <S id="transfer" title="6. Where it is stored">
        <p>Our database, files and servers are hosted by Supabase, Vercel and Render, including in the United States. This means your data is transferred outside Kenya. We use providers that protect data with encryption and contractual safeguards, and transfer only what is needed to run UniHive, as permitted under the Data Protection Act.</p>
      </S>

      <S id="retention" title="7. How long we keep it">
        <L items={[
          'Account data — while your account is open. When you close it we delete or anonymise your personal data, except what we must keep as set out below.',
          'Payment, order and wallet records — as long as tax and accounting laws require (currently at least five years).',
          'Messages and dispute records — as long as needed to resolve disputes and prevent fraud.',
          'Identity documents — only as long as needed for verification and fraud prevention.',
          'Event photos and videos — until you ask us to remove ones you appear in, or we no longer use them.',
        ]} />
      </S>

      <S id="security" title="8. How we protect it">
        <L items={[
          'Encryption in transit (HTTPS) and at rest.',
          'Row-level security, so users can read only their own private data.',
          'Identity documents are stored in private storage, not publicly accessible.',
          'Role-based access: partner brands, staff and administrators see only what their role needs.',
          'Automated backups, monitoring and access logs.',
        ]} />
      </S>

      <S id="rights" title="9. Your rights">
        <p>Under the Data Protection Act you have the right to:</p>
        <L items={[
          'be told how your data is used, and access a copy of it;',
          'have inaccurate or incomplete data corrected (you can edit most details yourself in your profile);',
          'have your data deleted where we no longer have a lawful reason to keep it;',
          'object to processing, or withdraw consent you have given;',
          'receive your data in a portable format.',
        ]} />
        <p>Contact us using the details below and we will respond within the time the law requires. If you are unhappy with our response you can complain to the <a className="underline" href={CONTACT.odpcUrl} target="_blank" rel="noreferrer">Office of the Data Protection Commissioner (ODPC)</a>.</p>
      </S>

      <S id="minors" title="10. Under 18s">
        <p>Our events and age-restricted items are for people aged 18 and over. People under 18 may use the marketplace only with a parent or guardian&rsquo;s consent. If you believe a child has given us data without consent, contact us and we will delete it.</p>
      </S>

      <S id="device" title="11. Device storage & analytics">
        <L items={[
          'UniHive stores small pieces of information in your browser (local storage) that the site needs to work: keeping you signed in, your cart, your theme and similar preferences. They are not used for advertising.',
          'We use Vercel Web Analytics to count page views. It does not use cookies or build a profile of you, and reports only aggregated, anonymous statistics.',
        ]} />
      </S>

      <S id="breach" title="12. Data breaches">
        <p>If a breach affects your personal data, we will contain it, assess the risk, notify the ODPC within 72 hours where required, and tell affected users without undue delay where there is a real risk of harm.</p>
      </S>

      <S id="changes" title="13. Changes">
        <p>We will update this policy as UniHive changes. For important changes we will show the new version and ask signed-in users to accept it. The date at the top shows the latest version.</p>
      </S>

      <S id="contact" title="14. Contact">
        <p>For questions or to exercise your rights:</p>
        <Contact />
      </S>
    </Shell>
  );
}
