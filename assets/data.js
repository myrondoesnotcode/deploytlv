/* Deploy D6: single source of truth for the media site mockup.
   Every page renders stories, the guide, events, numbers and offers from here.
   Dates are ISO (Asia/Jerusalem). Past guide items hide themselves; "TODAY" /
   "TOMORROW" labels are computed, never typed. Media paths are relative to d6/. */
window.DEPLOY = {
  links: {
    instagram: 'https://instagram.com/deploytlv',
    youtube: 'https://www.youtube.com/watch?v=bh5vQedObiQ',
    linkedin: 'https://www.linkedin.com/company/deploytlv',
    whatsapp: 'https://deploytlv.com/join/',
    academy: '/academy/',
    academy101: '/academy/build-and-ship/',
    email: 'hello@deploytlv.com'
  },

  /* Signups go to the Deploy Log, the same list and consent flow as the Deploy DB
     (deploytlv.com/db/, Supabase project "deploy-db"; Beehiiv is the list of record).
     The form sends a one-click sign-in link; when it's clicked, the subscription is
     recorded with the exact consent wording below and pushed to Beehiiv. The anon key is
     public by design; row-level security protects the data. */
  newsletter: {
    name: 'Deploy Log',
    url: 'https://ketmhhwpkafgwvpwfukd.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldG1oaHdwa2FmZ3d2cHdmdWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTYwNTMsImV4cCI6MjEwODA5MjA1M30.zSQztsqTXU5xZURaG8SNCGEUoKfI3GyzDQogjXrSKrI',
    consent: 'Yes, send me the Deploy Log weekly email. I can unsubscribe anytime.'
  },

  /* Headline numbers. Each one is said once in the hero and once to partners. */
  stats: [
    { value: '1.1M', label: 'Instagram views in the last month' },
    { value: '745K', label: 'Views on our biggest story' },
    { value: '400+', label: 'People in the community' }
  ],
  /* Instagram audience (followers), from Instagram insights, 18 Oct 2026. */
  audience: { followers: '5,700+', israel: '72.5%', age: '84%', ageLabel: 'aged 25–44', nonFollowers: '98%' },

  /* Stories. `headline` is what the card says; `punch` is the reel's last line,
     kept for the story page. A story with no `posted` date shows as "coming soon"
     and is left out of the feed. */
  stories: [
    { id: 'waze', name: 'Waze', thumb: '../thumbs/card-waze-v2.jpg', views: '126K', rank: 1, color: 'sun',
      headline: 'He gave his map away. Google paid $1B.',
      hook: 'An Israeli programmer gave his map away for free.',
      punch: 'Waze stayed home.',
      who: 'Ehud Shabtai, Uri Levine and Amir Shinar · Waze founded 2008 · bought by Google in 2013',
      ig: 'https://www.instagram.com/deploytlv/reel/DeClc4-tpzR/', posted: '2026-10-03', sources: [{ outlet: "Haaretz", title: "Waze founder in 2006: maps belong to the community", url: "https://www.haaretz.com/israel-news/business/2014-03-31/ty-article/waze-founder-in-2006-maps-belong-to-community/0000017f-e1a5-d38f-a57f-e7f78d4f0000" }, { outlet: "Times of Israel", title: "Why Waze went with Google", url: "https://www.timesofisrael.com/you-have-reached-your-destination-why-waze-went-with-google/" }, { outlet: "Times of Israel", title: "Google snags Israeli map app Waze", url: "https://www.timesofisrael.com/google-snags-israeli-map-app-waze/" }, { outlet: "Adweek", title: "Facebook-Waze talks are off", url: "https://www.adweek.com/performance-marketing/waze-talks-off/" }],
      transcript: "An Israeli programmer gave his map away for free. Seven years later, Google paid about a billion dollars for it. In 2006, Ehud Shabtai started FreeMap Israel, a map anyone could help build. He wrote: \"I don't see the maps as something that belongs to me, but rather to the community.\" In 2008, with Uri Levine and Amir Shinar, it became Waze. \"When we started, we started with a blank page, so there was no map. And actually the map was created by the drivers.\" Report a jam, a crash, a police car, and everyone behind you knew. By 2013, nearly 50 million people drove with it. Facebook reportedly offered up to a billion dollars. The reported catch: the team would have to leave Israel. \"People don't want to go away. They don't want to relocate to other places.\" Waze said no. Less than two weeks later: \"Google came with a proposal to acquire us, and we said yes.\" This time, nobody had to move. \"You can stay Waze, you can stay in Israel.\" Waze stayed home." },
    { id: 'base44', name: 'Base44', thumb: '../thumbs/card-base44.jpg', views: '60.8K', color: 'pink',
      headline: 'A reservist built his partner an app. Wix paid $80M.',
      hook: 'He built it for one tattoo artist.',
      punch: 'He built it for one tattoo artist.',
      who: 'Maor Shlomo · Base44 started 2025 · bought by Wix six months later',
      ig: 'https://www.instagram.com/deploytlv/reel/DePZxsQtN79/', posted: '2026-10-08', sources: [{ outlet: "TechCrunch", title: "Six-month-old Base44 sells to Wix for $80M cash", url: "https://techcrunch.com/2025/06/18/6-month-old-solo-owned-vibe-coder-base44-sells-to-wix-for-80m-cash" }, { outlet: "Calcalist", title: "The tattoo artist behind Base44’s origin story", url: "https://www.calcalistech.com/ctechnews/article/skdvnm78ge" }, { outlet: "Calcalist", title: "\"I built software that builds software\"", url: "https://www.calcalistech.com/ctechnews/article/y0kdgmw7a" }, { outlet: "Calcalist", title: "Base44 doubles ARR to $200 million", url: "https://www.calcalistech.com/ctechnews/article/syw900pvdzg" }],
      transcript: "Months later, Wix paid $80 million for his app. Maor Shlomo had already run a startup that raised $125 million. After a year of reserve duty, he wanted something small. His partner, a tattoo artist, needed software for her studios. \"So that's how I started Base44, with the intention of allowing my wife to build her own tools for her business.\" No investors. He wanted Base.com. It was taken, so he added numbers until one was free. He landed on 44. Then a rival raised close to $100 million. He didn't raise a dollar. He ignored the rival and built whatever his users asked for. In May, it made $189,000 in profit. In June, Wix bought it for $80 million in cash, six months after he started. Today, it reportedly makes $200 million a year. \"For most of its life, Base44 was actually a one-person operation. It was just me and a bunch of agents.\" He never built it for the market. He built it for one tattoo artist." },
    { id: 'wonderful', name: 'Wonderful', thumb: '../thumbs/card-wonderful.jpg', views: '28.9K', color: 'lime',
      headline: 'They broke the first rule of Israeli startups.',
      hook: 'Start anywhere but Israel. They started in Israel.',
      punch: 'The market they said to skip.',
      who: 'Bar Winkler and Roey Lalazar · Wonderful founded 2025 · AI agents that answer customer calls',
      ig: 'https://www.instagram.com/deploytlv/reel/DeL8FywMaVH/', posted: '2026-10-07', sources: [{ outlet: "TechCrunch", title: "Wonderful more than doubles its valuation to $5B", url: "https://techcrunch.com/2026/09/02/wonderful-more-than-doubles-its-valuation-to-5b-in-under-6-months/" }, { outlet: "Calcalist", title: "Wonderful raises $34M in seed funding", url: "https://www.calcalistech.com/ctechnews/article/skluyjmblg" }, { outlet: "Globes", title: "Wonderful: holding the AI customer’s hand", url: "https://en.globes.co.il/en/article-6-wonderful-holding-the-ai-customers-hand-1001546036" }],
      transcript: "Two Israelis built a $5 billion company by making what they call the textbook mistake: don't start in Israel. In early 2025, they started there anyway. AI agents that answer customer calls in Hebrew. Then they did it again. In Greek, in Italian. Country after country. Just not the obvious one. \"They're serving Athens now, serving the Greek market. That's all they do, right?\" Today, 35 countries, the company says. $5 billion. And America? \"We're not going to the U.S. at the moment, no.\"" },
    { id: 'wiz', name: 'Wiz', thumb: '../thumbs/card-wiz.jpg', views: '19.1K', color: 'sky',
      headline: "He turned down Google's reported $23B.",
      hook: 'Four friends from the army, and one very big no.',
      punch: 'The offer kept changing. The four of them never did.',
      who: 'Assaf Rappaport, Ami Luttwak, Yinon Costica and Roy Reznik · Wiz founded 2020',
      since: 'Since this story: Google agreed to buy Wiz for $32 billion in March 2025. The deal closed in March 2026.',
      ig: 'https://www.instagram.com/deploytlv/reel/DeHG3ZONN1t/', posted: '2026-10-05', sources: [{ outlet: "Index Ventures", title: "How Assaf Rappaport and his co-founders built Wiz", url: "https://www.indexventures.com/perspectives/cloud-captains-how-assaf-rappaport-and-his-extraordinary-co-founders-built-the-worlds-fastest-growing-company/" }, { outlet: "Wiz", title: "$100M ARR in 18 months", url: "https://www.wiz.io/blog/100m-arr-in-18-months-wiz-becomes-the-fastest-growing-software-company-ever" }, { outlet: "Globes", title: "Wiz turns down Google’s $23b offer", url: "https://en.globes.co.il/en/article-1001484935" }, { outlet: "Calcalist", title: "\"I received an envelope with $30 billion written on it\"", url: "https://www.calcalistech.com/ctechnews/article/axz6vctaz" }],
      transcript: "He said no to a reported $23 billion. Then he said no to 30. Four Israelis meet in the army: Assaf, Ami, Roy and Yinon. Their first company sells to Microsoft. In 2020, all four quit. Together, they start Wiz. 18 months after its first sale, Wiz hits $100 million a year. It says no software company ever got there faster. July 2024: Wiz is worth $12 billion. Google's reported offer is almost double. Assaf says no. By his own account, he pictured the headline: the CEO who could have sold for 23. \"When I needed to bet, I'm betting on my people and their execution abilities.\" Months later, Google comes back. By his account, the first envelope says 30. He says no again. Same four from the army bus. The offer kept changing. The four of them never did." },
    { id: 'pillcam', name: 'PillCam', thumb: '../thumbs/card-pillcam.jpg', views: '9.3K', color: 'orange',
      headline: 'A missile engineer took a dare. It took 20 years.',
      hook: 'A missile engineer took a dare from his neighbour.',
      punch: "Not bad for a few weeks' work.",
      who: 'Gavriel Iddan · Given Imaging · bought by Covidien in 2013',
      ig: 'https://instagram.com/deploytlv', posted: '2026-10-10', sources: [{ outlet: "Globes", title: "Covidien buys Given Imaging for $860m", url: "https://en.globes.co.il/en/article-1000899843" }, { outlet: "Times of Israel", title: "PillCam’s inventor regrets sale", url: "https://www.timesofisrael.com/pillcams-inventor-regrets-sale-of-biblical-tech-to-foreign-firm/" }, { outlet: "Medtronic", title: "PillCam SB3 @HOME clearance", url: "https://news.medtronic.com/2021-11-15-Medtronic-announces-510-k-clearance-for-PillCam-TM-Small-Bowel-3-HOME-endoscopy-procedure" }],
      transcript: "An Israeli missile engineer took a dare from his neighbor. It became an $860 million company. His neighbor, a gut doctor, couldn't see inside the small intestine. \"And if you're so smart, he told me, find a solution. I told him, well, it's going to take a few weeks' time.\" It took 20 years. A camera that small ran out of battery in minutes, and the trip through the gut takes hours. Four million patients have swallowed one since, the company says. Not bad for a few weeks' work." },
    { id: "tesla", name: "Tesla", thumb: "../thumbs/card-tesla.jpg", views: "745K", color: "lime", tag: "Most shared", headline: "Tesla's new Roadster drove upside down. Here's how.", hook: "Tesla's new Roadster just drove upside down.", punch: "You just can't buy one yet.", who: "Elon Musk · Tesla Roadster, shown live on 15 Oct 2026 · Tesla says production starts in 2028", ig: "https://instagram.com/deploytlv", posted: "2026-10-16", transcript: "\"We need an audience to prove that it's not AI.\" Because Tesla's new Roadster just drove upside down. Here's how. Fans under the car suck it onto the track with twice the force of gravity. So even upside down, it stays stuck to the ramp. Then it drives off the end, still upside down. \"What are they gonna burn? Nothing. Ultra high pressure compressed air.\" That's when the thrusters fire. Ten nozzles blast compressed air from two tanks and roll it upright in midair. And it lands on its wheels. The same thrusters flipped it over a row of Teslas. \"Where we're going, you don't need tires.\" Tesla promised this car by 2020. Production now starts in 2028. So it can drive upside down. You just can't buy one yet.", note: "Musk's full line at the event was \"We need an audience to prove it's not AI or SI.\" Reports describe the car launching upside down, twisting in midair and landing on its wheels. The number of nozzles and tanks comes from a single report.", sources: [{ outlet: "Reuters (via Star-Advertiser)", title: "Tesla unveils Roadster with thrusters, targets 2028 production", url: "https://www.staradvertiser.com/2026/10/16/breaking-news/tesla-unveils-roadster-with-thrusters-targets-2028-production/" }, { outlet: "Gizmodo", title: "Tesla's new Roadster can somehow do corkscrews in the air", url: "https://gizmodo.com/teslas-new-roadster-can-somehow-do-corkscrews-in-the-air-without-exploding-yet-2000826761" }, { outlet: "Deseret News", title: "New Tesla Roadster flies several meters in the air at Texas exhibition", url: "https://www.deseret.com/business/2026/10/16/new-tesla-roadster-flies-several-meters-in-the-air-at-texas-exhibition" }, { outlet: "CleanTechnica", title: "Tesla Roadster will really use SpaceX rocket thrusters", url: "https://cleantechnica.com/2020/05/24/tesla-roadster-will-really-use-spacex-thrusters-because-elon/" }] },
    { id: "calai", name: "Cal AI", thumb: "../thumbs/card-calai.jpg", views: "75.7K", color: "sky", headline: "15 colleges rejected him. Then he sold his app.", hook: "A teenager got rejected by fifteen colleges.", punch: "", who: "Zach Yadegari and Henry Langmack · Cal AI · bought by MyFitnessPal in December 2025", ig: "https://instagram.com/deploytlv", posted: "2026-10-09", transcript: "A Jewish teenager got rejected by fifteen colleges. The same week, he told his camera: \"We just did our biggest month: 2.8 million in revenue.\" Years earlier, he'd made a promise on YouTube: \"I'm going to make one million dollars before graduating high school.\" With a friend from coding camp, he built Cal AI. Snap your food, and it counts the calories. Senior year, the letters came. \"Harvard, rejected. Stanford, rejected. Yale, rejected. I was shocked.\" He posted the list. Twenty-eight million views. Miami said yes. By December, MyFitnessPal had bought his app. In April, on a Forbes stage, he had news for Miami: \"And to you, Miami, I had a great time. But please take this as my resignation. I'm dropping out. Thank you, Forbes.\"", note: "The quotes are Zach's own words from his videos. Reports put his college-rejection post at 22 to 27 million views, and describe him as likely to leave the University of Miami.", sources: [{ outlet: "TechCrunch", title: "MyFitnessPal has acquired Cal AI, the viral calorie app built by teens", url: "https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/" }, { outlet: "TechCrunch", title: "Teen who built Cal AI was rejected by 15 top universities", url: "https://techcrunch.com/2025/04/03/teen-with-4-0-gpa-who-built-the-viral-cal-ai-app-was-rejected-by-15-top-universities" }, { outlet: "The College Fix", title: "Teen behind AI app rejected from 15 colleges", url: "https://www.thecollegefix.com/teen-behind-30-million-ai-app-rejected-from-15-colleges/" }, { outlet: "Fortune", title: "Gen Z founder treats college like vacation", url: "https://fortune.com/2025/09/27/gen-z-founder-treats-college-like-vacation-30-million-app-by-18/" }] },
    { id: "land", name: "Polaroid", thumb: "../thumbs/card-land.jpg", views: "5.1K", color: "pink", headline: "A 3-year-old's question became Polaroid.", hook: "A three-year-old asked her dad one question.", punch: "Next time you see a photo the second you take it, thank a three-year-old.", who: "Edwin Land · Polaroid · first instant print shown in 1947", ig: "https://instagram.com/deploytlv", posted: "2026-10-12", transcript: "A Jewish inventor's three-year-old asked him one question. It became a billion-dollar company. Santa Fe, 1943. Edwin Land snapped his daughter's photo. Back then, film took days at a lab. So she asked why she couldn't see it now. Land went for a walk. Within an hour, he'd pictured a camera that develops its own photo. It took three years of chemistry. Then, in 1947: a finished print in one minute. The first Polaroid cameras sold out on day one. By the late seventies, Polaroid sold over a billion dollars a year. And Steve Jobs called Land one of his heroes. \"A camera that would be, oh, like the telephone, something that you use all day long.\" Next time you see a photo the second you take it, thank a three-year-old.", sources: [{ outlet: "Harvard Business School", title: "The idea of instant photography", url: "https://www.library.hbs.edu/hc/polaroid/instant-photography/the-idea-of-instant-photography" }, { outlet: "Harvard Business School", title: "Instant photography is launched", url: "https://www.library.hbs.edu/special-collections-and-archives/exhibits/polaroid-from-concept-to-product/instant-photography-is-launched" }, { outlet: "History.com", title: "First Polaroid camera sold", url: "https://www.history.com/this-day-in-history/november-26/first-polaroid-camera-sold" }, { outlet: "Christian Science Monitor", title: "Polaroid developing new products to snap back", url: "https://www.csmonitor.com/1985/0517/fpola.html" }, { outlet: "Fortune", title: "Polaroid's instant karma", url: "https://fortune.com/2012/10/05/polaroids-instant-karma" }] },
  ],

  /* Flagship long-form. Its own section and TV channel 3. */
  longform: { yt: 'bh5vQedObiQ', title: 'Trump Renamed AI. Now Everyone Wants These Domains.',
    poster: 'https://i.ytimg.com/vi/bh5vQedObiQ/maxresdefault.jpg',
    blurb: "Why everyone is suddenly buying .si domains. I go on camera to explain it, cut together in our paper-collage style." },

  /* Events we covered with the mic. `video` = a local clip when the reel isn't on Instagram. */
  aired: [
    { id: 'aws', who: 'AWS', what: 'AWS Summit Tel Aviv', date: '2026-09-10', color: 'orange',
      ig: 'https://www.instagram.com/deploytlv/reel/DdJokfnNW_0/', clip: '../clips/aws.mp4', poster: '../clips/aws.jpg', cover: '../thumbs/cover-aws.jpg' },
    { id: 'nebius', who: 'Nebius', what: 'Builders & Brews', date: '2026-09-15', color: 'lime',
      ig: 'https://www.instagram.com/deploytlv/reel/DdgGgtNtCiO/', clip: '../clips/nebius.mp4', poster: '../clips/nebius.jpg', cover: '../thumbs/cover-nebius.jpg' },
    { id: 'agentic', who: 'Agentic', what: 'Agentic Israel at Startup Nation Central', date: '2026-10-05', color: 'sky',
      ig: null, clip: '../clips/agentic-v2.mp4', poster: '../clips/agentic-v2.jpg', cover: '../thumbs/cover-agentic-v2.jpg' }
  ],

  /* Deploy nights + the startup event. `applied` = everyone who applied on Luma (latest export). */
  nights: [
    { code: 'DEPLOY_001', title: 'The first Deploy', date: '2026-05-18', applied: 60 },
    { code: 'DEPLOY_002', title: 'AI Showcase', date: '2026-06-08', applied: 86 },
    { code: 'DEPLOY_003', title: 'First Dollar Stories', date: '2026-07-06', applied: 134 },
    { code: 'DEPLOY_004', title: 'Using AI to Hack Growth', date: '2026-07-29', applied: 136 },
    { code: 'DEPLOY_005', title: 'AI Showcase', date: '2026-09-07', applied: 124 },
    { code: 'STARTUPS_001', title: 'Deploy for Startups', date: '2026-10-12', applied: 178 }
  ],

  /* The TV guide: what's coming up. `date` items disappear once past; `recurring` ones stay. */
  guide: [
    { weekly: 3, time: '19:00 – 21:00', cat: 'Workshop', color: 'sun', title: 'Academy 101: Build & ship a website with AI', badge: '10 SEATS',
      body: 'Every Wednesday. Two hours, beginners welcome, in English. Leave with your own website live on the internet.', cta: 'Book a seat', href: '/academy/build-and-ship/', hot: true },
    { date: '2026-11-04', time: '18:00 – 20:00 · Sarona', cat: 'Deploy night', color: 'orange', title: 'DEPLOY_006', badge: 'NEXT',
      body: 'Our sixth night, at Sarona in Tel Aviv. People show what they built, then the room takes over. Free, in English.', cta: 'RSVP on Luma', href: 'https://luma.com/o8dzr1kh', hot: true },
    { date: '2026-11-16', time: '19:00 – 21:00 · 4 weeks', cat: 'Course', color: 'sun', title: 'Academy 201: Build an app with AI', badge: 'NEW',
      body: 'Four Monday evenings. Leave with your own working app, live on the internet and on your phone. ₪1,200.', cta: 'See the course', href: '/academy/build-an-app/' },
    { recurring: 'Every week', sub: 'Tel Aviv', cat: 'Coworking', color: 'lime', title: 'Bring your laptop',
      body: 'We take over a room and build next to each other. The WhatsApp group has this week’s day and place.', cta: 'Get the details', href: 'whatsapp', video: '../clips/coworking.mp4', poster: '../clips/coworking.jpg' },
    { recurring: 'Every few days', sub: 'Instagram', cat: 'New story', color: 'pink', title: 'A new story',
      body: 'The companies, the bets and the people behind them, in under a minute.', cta: 'Follow', href: 'instagram' }
  ],

  /* Academy classes. A class whose date has passed shows "next date soon" + the waitlist. */
  academy: [
    { code: '101', weekly: 3, time: '19:00', title: 'Build & ship a website with AI', meta: 'Every Wednesday · 2 hours · ₪250', href: '/academy/build-and-ship/' },
    { code: '201', date: '2026-11-16', time: '19:00', title: 'Build an app with AI', meta: '4 Monday evenings · ₪1,200', href: '/academy/build-an-app/' },
    { code: '102', date: null, title: 'Edit video with AI', meta: 'Waitlist open · ₪300', href: '/academy/edit-video/' }
  ],

  /* ---------- money: what partners can buy ---------- */
  coverage: {
    name: 'The Mic', from: 3000, area: 'Tel Aviv',
    pitch: 'I come to your event with the orange mic, talk to the people in the room, and we publish a finished reel.',
    includes: ['Myron on the mic at your event', 'One edited reel in the Deploy style', 'Posted on @deploytlv as a collab post', 'The video file for your own channels'],
    addons: ['Short interview cuts with your speakers', 'A story page on deploytlv.com', 'Multi-day or recurring events, covered as a series', 'A mention in the weekly email']
  },

  /* Only formats we have a real example of. */
  studio: [
    { id: 'founder', name: 'Founder story', color: 'orange', clip: '../clips/waze.mp4', poster: '../clips/waze.jpg', proof: '126K views',
      pitch: 'Your company told the way our stories are told: one bet, one turn, under a minute, vertical.' },
    { id: 'explainer', name: 'Long-form explainer', color: 'sun', img: 'https://i.ytimg.com/vi/bh5vQedObiQ/maxresdefault.jpg', proof: 'On YouTube',
      pitch: 'A YouTube-length explainer, hosted on camera and cut in our paper-collage style.' },
    { id: 'recap', name: 'Event recap', color: 'sky', clip: '../clips/aws.mp4', poster: '../clips/aws.jpg', proof: 'AWS Summit TLV',
      pitch: 'A fast vertical recap of your event, with the people in the room on camera.' }
  ],

  sponsorship: {
    pitch: 'Put your name on the stories Tel Aviv tech watches.',
    includes: ['A "presented by" card at the start of every story', 'Your name in every caption', 'Your logo on every story page on deploytlv.com', 'A mention in the weekly email', 'A monthly report: views, reach, saves'],
    terms: 'Monthly. One sponsor at a time.'
  },

  /* People in the room (from the old homepage; already public there). */
  people: [
    { name: "Eliezer Steinbock", role: "Inbox Zero · Founder", img: '../people/Eliezer_Steinbock.jpg' },
    { name: "Matthew Sigurko", role: "F5 · Principal Software Engineer", img: '../people/Matthew_Sigurko.jpg' },
    { name: "Mona Cohen", role: "offtheradar.ai · Founder", img: '../people/Mona_Cohen.jpg' },
    { name: "Shahar Luftig", role: "Explorium · Tech Lead", img: '../people/Shahar_Luftig.jpg' },
    { name: "Neta Dror", role: "HaDigitalit · Founder", img: '../people/Neta_Dror.jpg' },
    { name: "Ilan Oz", role: "Team8 · EmberNovels", img: '../people/Ilan_Oz.jpg' },
    { name: "Yehonatan Tsirolnik", role: "SailPoint · Nemus", img: '../people/Yehonatan_Tsirolnik.jpg' },
    { name: "Artem Belyakov", role: "Medida · Founding Engineer", img: '../people/Artem_Belyakov.jpg' },
    { name: "Ariel Cohen", role: "Swan · Founding GTM Engineer", img: '../people/Ariel_Cohen.jpg' }
  ],
  /* Companies our community works at. Logos live in /assets/logos. */
  memberLogos: [
    { src: '/assets/logos/monday.png', alt: 'monday.com' }, { src: '/assets/logos/google.png', alt: 'Google' },
    { src: '/assets/logos/aleph.svg', alt: 'Aleph' }, { src: '/assets/logos/team8.svg', alt: 'Team8' },
    { src: '/assets/logos/walkme_light.svg', alt: 'WalkMe' }, { src: '/assets/logos/payoneer.svg', alt: 'Payoneer' }
  ],
  /* Footage from the nights, shown in The room. */
  nightClips: [
    { src: '../clips/night-deploy2.mp4', poster: '../clips/night-deploy2.jpg', cap: 'Deploy #2 · AI Showcase' },
    { src: '../clips/night-deploy4.mp4', poster: '../clips/night-deploy4.jpg', cap: 'Deploy #4 · Using AI to Hack Growth' }
  ],

  /* Companies people in the community are building. */
  builds: ['Inbox Zero','NewHedge','Swan','offtheradar.ai','Novee Security','Decode Insights','Nemus','Mana Intelligence','OrganizEat','HaDigitalit','Fundgen','Opus Eternal','DragonBot','Blackspot','PodSnacks'],

  /* Real photos from our nights. Filled in from the photo search. */
  room: [
    { src: '../thumbs/room-v2-1.jpg', cap: 'DEPLOY_005 · demo night', alt: 'A packed room talking at DEPLOY_005' },
    { src: '../thumbs/room-v2-2.jpg', cap: 'mid-demo', alt: 'The audience watching a demo at DEPLOY_005' },
    { src: '../thumbs/room-v2-3.jpg', cap: 'Deploy for Startups · 12 Oct', alt: 'Rows of people at Deploy for Startups' },
    { src: '../thumbs/room-v2-4.jpg', cap: 'Academy · building', alt: 'Academy students building on laptops' },
    { src: '../thumbs/room-v2-5.jpg', cap: 'laptops out', alt: 'People working on laptops on sofas' },
    { src: '../thumbs/room-v2-6.jpg', cap: 'help at every table', alt: 'Helping a student next to the Deploy banner' }
  ],

  /* Host page. */
  host: {
    name: 'Myron Shneider',
    portrait: '../host-portrait.png', hero: '../host-hero.png', fun: '../host-fun.png',
    /* The host pops up at the start of each home-page section with one line.
       Images are sticker cut-outs (white border baked in). */
    pops: {
      stories:   { img: '../pop-stories.webp', line: 'Tap one. You\u2019ll end up watching all of them.' },
      longform:  { img: '../pop-longform.webp', line: 'When a minute isn\u2019t enough.' },
      onthemic:  { img: '../pop-onthemic.webp', line: 'Where the orange mic has been.' },
      guide:     { img: '../pop-guide.webp', line: 'Here\u2019s where I\u2019ll be.' },
      community: { img: '../pop-community.webp', line: 'Come say hi.' },
      partner:   { img: '../pop-partner.webp', line: 'Want the mic at your event?' }
    },
    photos: [
      { src: '../thumbs/host-1.jpg', cap: 'on stage at DEPLOY_005', alt: 'Myron on the mic on stage at DEPLOY_005' },
      { src: '../thumbs/host-2.jpg', cap: 'demo night', alt: 'Myron hosting demo night in front of the crowd' },
      { src: '../thumbs/host-3.jpg', cap: 'teaching Academy #2', alt: 'Myron teaching at the screen during Deploy Academy' }
    ]
  }
};
