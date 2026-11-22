// Bolt the guide drone: scripted knowledge base + fuzzy matcher. No imports, no DOM. Original content.
const MAP = {
  u: "you", ur: "your", yu: "you", r: "are", y: "why", n: "and", wat: "what", wut: "what", wht: "what", whut: "what", wot: "what",
  wats: "what is", watz: "what is", whatz: "what is", thx: "thanks", thnx: "thanks", thanx: "thanks", tnx: "thanks", thks: "thanks",
  ty: "thank you", tysm: "thank you so much", pls: "please", plz: "please", plss: "please", pleez: "please", pleaze: "please", pliz: "please",
  idk: "i do not know", idc: "i do not care", dunno: "i do not know", sup: "what is up", wassup: "what is up", wazzup: "what is up",
  wazup: "what is up", wasup: "what is up", whatsup: "what is up", wsup: "what is up", wsg: "what is up", whazzup: "what is up",
  waddup: "what is up", whaddup: "what is up", wussup: "what is up", hru: "how are you", hbu: "how about you", wbu: "what about you",
  whats: "what is", hows: "how is", wheres: "where is", whos: "who is", whys: "why is", thats: "that is", theres: "there is",
  heres: "here is", lets: "let us", im: "i am", iam: "i am", ive: "i have", youre: "you are", youve: "you have", youll: "you will",
  theyre: "they are", hes: "he is", shes: "she is", its: "it is", dont: "do not", doesnt: "does not", didnt: "did not",
  cant: "can not", cannot: "can not", wont: "will not", isnt: "is not", arent: "are not", wasnt: "was not", couldnt: "could not",
  shouldnt: "should not", wouldnt: "would not", havent: "have not", hasnt: "has not", aint: "is not", gonna: "going to",
  wanna: "want to", gotta: "got to", lemme: "let me", gimme: "give me", kinda: "kind of", cuz: "because", coz: "because", bc: "because",
  tho: "though", rn: "right now", gr8: "great", b4: "before", l8r: "later", cya: "see you", gn: "good night", gm: "good morning",
  byee: "bye", hii: "hi", heyy: "hey", yoo: "yo", okk: "ok", okay: "ok", okey: "ok", oki: "ok", k: "ok", kk: "ok", yeah: "yes",
  yea: "yes", yep: "yes", yup: "yes", yass: "yes", ye: "yes", nah: "no", nope: "no", naw: "no", goin: "going", doin: "doing",
  nothin: "nothing", somethin: "something", mornin: "morning", evenin: "evening", gud: "good", gd: "good", hlp: "help", halp: "help",
  nvm: "never mind", wyd: "what are you doing", whatcha: "what are you", ya: "you", yall: "you all", happenin: "happening", crackin: "cracking",
  srsly: "seriously", ily: "i love you", imma: "i am going to", dat: "that", dis: "this", teh: "the", rly: "really", noo: "no", thnks: "thanks",
  thanku: "thank you", thankyou: "thank you", plzz: "please", gtg: "got to go", g2g: "got to go", brb: "be right back", sry: "sorry", soz: "sorry",
  becuz: "because", hw: "how", wen: "when", cud: "could", shud: "should", yah: "yes", okie: "ok", kay: "ok",
  tel: "tell", ppl: "people", abt: "about", bout: "about", w: "with", wit: "with", sumthing: "something", wanted: "wanted"
};
// token weight classes: content 20, question words 10, pronoun/aux 6, filler 3
const FILL = new Set("a an the of to it at for and or so be just really very please this that".split(" "));
const QW = new Set("what who where how why when which".split(" "));
const AUX = new Set("i you your me my we is are am do does did can could would should will have has with not no in on up off down".split(" "));
const LITE = new Set("there here under over some any thing things stuff like kind about maybe um uh hey now then also too get got go see look find put use know think want need make bolt one oh ok yes".split(" "));
function wOf(t) { return FILL.has(t) ? 3 : QW.has(t) ? 10 : AUX.has(t) ? 6 : LITE.has(t) ? 9 : 20; }

export function normalize(text) {
  if (typeof text !== "string") text = text == null ? "" : (typeof text === "object" ? "" : String(text));
  if (text.length > 400) text = text.slice(0, 400);
  let s = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/['‘’ʼ`´]/g, "");
  s = s.replace(/[^a-z0-9]+/g, " ");
  s = s.replace(/([a-z])\1{2,}/g, "$1");
  const raw = s.split(" ");
  const out = [];
  for (let i = 0; i < raw.length && out.length < 60; i++) {
    const t = raw[i];
    if (!t) continue;
    out.push(Object.prototype.hasOwnProperty.call(MAP, t) ? MAP[t] : t);
  }
  s = " " + out.join(" ") + " ";
  s = s.replace(/ what up /g, " what is up ").replace(/ a i /g, " ai ").replace(/ how r u /g, " how are you ");
  return s.trim().replace(/ +/g, " ");
}

// ---------- intent registry ----------
const D = [];
function I(name, action, pats, replies, opt) {
  const seen = new Set();
  const patterns = [];
  const list = Array.isArray(pats) ? pats : pats.split("|");
  for (const p of list) {
    const n = normalize(p);
    if (n && !seen.has(n)) { seen.add(n); patterns.push(n); }
  }
  const it = Object.assign({ name, action: action || null, patterns, replies: replies.slice(), pr: 1 }, opt || {});
  D.push(it);
  return it;
}


// ---------- facts ----------
// Every fact is verified against a reputable source; the URL is in `source`. reply() only serves verified === true.
const F = (text, topic, source, verified) => ({ text, topic, source, verified: !!verified });
const FACTS = [
  // supplied and verified by the lead (meaning unchanged; source URLs added)
  F("The eight planets from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.", "space", "NASA Solar System Exploration, https://science.nasa.gov/solar-system/planets/", true),
  F("Saturn is the only planet less dense than water. It would float in a giant bathtub!", "space", "NASA, https://science.nasa.gov/saturn/facts/", true),
  F("Neptune has the fastest winds in the solar system. Hold onto your hat!", "space", "NASA, https://science.nasa.gov/neptune/facts/", true),
  F("Mars looks red because its dust contains iron oxide. That is rust!", "space", "NASA, https://science.nasa.gov/mars/facts/", true),
  F("Water pressure rises about one atmosphere for every 10 meters (33 feet) of depth.", "ocean", "NOAA National Ocean Service, https://oceanservice.noaa.gov/facts/pressure.html", true),
  F("A fresh egg sinks in fresh water but floats in salty water, because salt water is denser.", "ocean", "NOAA Ocean Learning, https://www.noaa.gov/ocean/ll-eggs", true),
  F("A lever balances when weight times distance is equal on both sides.", "machines", "HyperPhysics, Georgia State University, https://hyperphysics.gsu.edu/hbase/Class/PhSciLab/torequ.html", true),
  F("Mixing red and green light makes yellow. Red, green and blue light together make white!", "light", "Ingersoll Physics Museum, University of Wisconsin-Madison, https://www.physics.wisc.edu/ingersollmuseum/color-mixing", true),
  F("A shorter xylophone bar vibrates faster, so it sounds higher.", "sound", "University of Connecticut Physics, https://www.phys.uconn.edu/~gibson/Notes/Section4_1/Sec4_1.htm", true),
  F("In 24-hour time, 18:45 is 6:45 pm. Just subtract 12 after noon.", "time", "Britannica, https://www.britannica.com/topic/24-hour-clock", true),
  F("In Morse code, SOS is three short signals, three long, then three short.", "code", "Britannica, https://www.britannica.com/question/How-does-Morse-Code-work", true),
  F("Light bounces off a flat mirror at the same angle it arrives.", "light", "HyperPhysics, Georgia State University, https://hyperphysics.gsu.edu/hbase/phyopt/reflectcon.html", true),
  F("The Moon does not make its own light. It reflects sunlight.", "space", "NASA, https://science.nasa.gov/moon/moonlight/", true),
  F("A triangle has 3 sides and 3 corners.", "math", "Britannica, https://www.britannica.com/science/triangle-mathematics", true),
  F("Stare at one color for a while, then look away: you briefly see its opposite color. That is an afterimage!", "brain", "Neuroscience for Kids, University of Washington, https://staff.washington.edu/chudler/after.html", true),
  // audited Nov 2026: confirmed against the source shown
  F("The Sun is a star, and it is about 4.6 billion years old.", "space", "NASA, https://science.nasa.gov/sun/facts/", true),
  F("Sunlight takes about 8 minutes to travel to Earth.", "space", "Smithsonian National Air and Space Museum, https://howthingsfly.si.edu/ask-an-explainer/how-long-does-it-take-light-sun-get-earth", true),
  F("Jupiter's Great Red Spot is a giant storm bigger than Earth.", "space", "NASA Hubble, https://science.nasa.gov/asset/hubble/jupiters-great-red-spot-2/", true),
  F("Venus spins backward compared with most planets.", "space", "NASA Space Place, https://spaceplace.nasa.gov/all-about-venus/", true),
  F("Saturn's rings are made mostly of chunks of ice.", "space", "NASA Space Place, https://spaceplace.nasa.gov/all-about/saturn-rings", true),
  F("Mercury is the smallest planet in our solar system.", "space", "NASA Space Place, https://spaceplace.nasa.gov/all-about-mercury/", true),
  F("Astronauts float on the space station because they are in constant free fall around Earth.", "space", "NASA, https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-microgravity-grades-5-8/", true),
  F("The ocean covers about 71 percent of Earth's surface.", "ocean", "USGS Water Science School, https://www.usgs.gov/water-science-school/science/how-much-water-there-earth", true),
  F("Most of the ocean has never been explored or even seen by people.", "ocean", "NOAA Ocean Exploration, https://oceanexplorer.noaa.gov/facts/explored.html", true),
  F("The blue whale is the largest animal known to have ever lived.", "ocean", "Britannica, https://www.britannica.com/animal/blue-whale", true),
  F("An octopus has three hearts.", "ocean", "National Geographic Education, https://education.nationalgeographic.org/resource/animals-101-octopuses/", true),
  F("Light is the fastest thing there is, about 300,000 kilometers every second.", "light", "Florida State University Molecular Expressions, https://micro.magnet.fsu.edu/primer/lightandcolor/speedoflight.html", true),
  F("A rainbow is sunlight split into its colors by raindrops.", "light", "NOAA SciJinks, https://scijinks.gov/rainbow", true),
  F("Sound travels about four times faster in water than in air.", "sound", "Discovery of Sound in the Sea, University of Rhode Island, https://dosits.org/?p=235", true),
  F("Sound cannot travel through empty space, because it needs air or something else to move through.", "sound", "Caltech IPAC Cool Cosmos, https://coolcosmos.ipac.caltech.edu/ask/241--Can-you-hear-sound-in-space", true),
  F("A ramp is a simple machine that makes lifting heavy things easier.", "machines", "Britannica, https://www.britannica.com/technology/inclined-plane", true),
  F("A pulley can change the direction you pull to lift something.", "machines", "National Geographic Explorer, https://explorer-mag.nationalgeographic.org/pathfinder_april_2019/pulleys_on_the_move_and_trade-offs", true),
  F("Optical illusions happen because your brain makes quick guesses about what you see.", "brain", "Queensland Brain Institute, University of Queensland, https://qbi.uq.edu.au/node/10112", true),
  F("Every eye has a blind spot where the nerve leaves the eye, and your brain fills it in.", "brain", "Britannica, https://www.britannica.com/science/blind-spot", true),
  F("Earth is the only place we know of that has life.", "space", "NASA, https://science.nasa.gov/earth/facts/", true),
  F("A day on Venus is longer than a year on Venus.", "space", "NASA Space Place, https://spaceplace.nasa.gov/all-about-venus/", true),
  F("Pluto is a dwarf planet, not one of the eight planets.", "space", "NASA Space Place, https://spaceplace.nasa.gov/all-about-pluto", true),
  // added Nov 2026, each confirmed against the source shown
  F("The Sun is the only star in our solar system.", "space", "NASA, https://science.nasa.gov/sun/facts/", true),
  F("The Sun is about 93 million miles (150 million kilometers) from Earth.", "space", "NASA, https://science.nasa.gov/sun/facts/", true),
  F("Saturn's ring pieces range from specks too tiny to see to chunks as big as a bus!", "space", "NASA Space Place, https://spaceplace.nasa.gov/all-about/saturn-rings", true),
  F("An octopus's three hearts: two pump blood to its gills, and one pumps it to the rest of its body.", "ocean", "National Geographic Education, https://education.nationalgeographic.org/resource/animals-101-octopuses/", true),
  F("The oceans hold about 96.5 percent of all the water on Earth.", "ocean", "USGS Water Science School, https://www.usgs.gov/water-science-school/science/how-much-water-there-earth", true),
  F("Sound zooms through seawater at about 1,500 meters every second.", "sound", "Discovery of Sound in the Sea, University of Rhode Island, https://dosits.org/?p=235", true),
  F("Light travels slower through water and glass than through empty space.", "light", "Florida State University Molecular Expressions, https://micro.magnet.fsu.edu/primer/lightandcolor/speedoflight.html", true),
  F("Your blind spot has no rods or cones, the cells that sense light. That is why it cannot see!", "brain", "Britannica, https://www.britannica.com/science/blind-spot", true)
];

// ---------- jokes (original or classic clean puns; no real people, bodies, religion, politics or groups) ----------
const JOKES = [
  "Why did Bolt get good grades? It always hovered near the top of the class!",
  "What does a drone wear on a chilly day? A hover-coat!",
  "Why did the robot go on vacation? It needed to recharge its batteries!",
  "What do robots snack on? Micro-chips!",
  "What is a robot's favorite music? Heavy metal!",
  "Why do robots never panic? They have nerves of steel.",
  "Why did the drone join the band? It had amazing propeller-cussion!",
  "What did the toy train say to the track? Thanks for always supporting me!",
  "Why do rubber ducks make great detectives? They always quack the case!",
  "Why did the teddy bear skip dessert? He was already stuffed!",
  "Why did the drum take a nap? It was totally beat!",
  "What did the star-shaped block say to its hole? We are a perfect match!",
  "Why did the triangle win the debate? It made three very good points!",
  "How does the solar system hold up its pants? With an asteroid belt!",
  "What is an astronaut's favorite key on the keyboard? The space bar!",
  "Why did the moon skip dinner? It was already full!",
  "What did Mars say to Saturn? Give me a ring sometime!",
  "How do you throw a party in space? You planet!",
  "What do planets like to read? Comet books!",
  "What is a telescope's favorite game? I Spy, from really far away!",
  "Why did the comet get so many fans? It always had a great tail to tell!",
  "Why was the fuse so calm? It never blew up over little things!",
  "What did the ocean say to the beach? Nothing, it just waved!",
  "What do you call a fish in a bow tie? Sofishticated!",
  "Why did the egg float to the top of the class? It took every lesson with a grain of salt!",
  "Why don't eggs tell jokes? They would crack each other up!",
  "Why don't jugs ever fib? They are always pour-fectly honest!",
  "Why does the raft get invited to every party? It keeps the fun afloat!",
  "Why did the grandfather clock get a hug? It was feeling a little wound up!",
  "What has hands but cannot clap? A clock!",
  "What has keys but cannot open a single lock? A piano!",
  "What kind of key opens a banana? A mon-key!",
  "Why was the library book so popular? It had lots of great stories!",
  "Why did the magnifying glass make a great friend? It always noticed the little things!",
  "Why did the painting go to the detective? It was framed!",
  "What did one padlock say to the other? We make a great combination!",
  "Why did the lever get a gold medal? Excellent balance under pressure!",
  "Why did the xylophone get invited to every party? It always hit the right notes!",
  "Why did red light and green light become best friends? Together they felt so mellow yellow!",
  "Why did the lamp do so well in school? It was very bright!",
  "Why did the mirror win an award? For excellent reflection on its work!",
  "Why does a laser never get lost? It always takes the straight path!",
  "Why did the secret agent stay in bed? They were undercover!",
  "What is a signal beacon's favorite dance? The flash mob!",
  "Why are Morse code fans so patient? They take everything one dot at a time!",
  "Why was the afterimage so polite? It always waited for you to look away first!",
  "Why did the puzzle piece smile? It finally found where it fit in!",
  "Why did the door go to school? It wanted to learn how to open up!",
  "What gets wetter the more it dries? A towel!",
  "What do you call a sleeping dinosaur? A dino-snore!",
  "Why was the math book sad? It had too many problems!",
  "Why was six afraid of seven? Because seven ate nine!",
  "What did the zero say to the eight? Nice belt!",
  "What is orange and sounds like a parrot? A carrot!",
  "Why did the bicycle fall over? It was two-tired!",
  "What did the big flower say to the little flower? Hi, bud!",
  "Why did the scarecrow win an award? It was outstanding in its field!",
  "What do you call a pig that does karate? A pork chop!",
  "Why did the cookie visit the bakery doctor? It was feeling crummy!",
  "Why did the star throw a party? It wanted everyone to shine!"
];

// ---------- rooms ----------
// about/flavor/goal/things/ask are spoken by Bolt; nothing here gives away a code or answer.
const ROOMS = {
  hub: { name: "the Lobby", about: "This is the Lobby, a floating village. Every glowing building is a different escape room, and the Skin Shop is on your right!",
    goal: "Pick a room! Look at any building for a second to step inside. Easy rooms first, or jump to a tough one.",
    things: "Seven glowing buildings, one for each room, plus the Skin Shop on your right. Its sign shows your stars and secrets found.",
    ask: "a room, stars or the Skin Shop",
    flavor: ["Welcome to the Lobby! Pick a glowing door and let's go.", "So many doors! Which one calls to you?", "Look at a building for a second to step inside."] },
  kids: { name: "the Toy Workshop", about: "This is the Toy Workshop! The big Toy Door is locked, and three shapes are missing from it.",
    goal: "Find the red star, blue moon and yellow triangle, fit them in the Toy Door, then answer its counting question. Want a tip?",
    things: "Toys! A teddy bear, a drum, a toy train, a rocket, a bouncy ball, rubber ducks, number blocks and the Toy Door. Look at one to poke it!",
    ask: "the teddy, the drum or the toy train",
    flavor: ["Ooh, a Toy Workshop! Look at things to poke them.", "Toys everywhere! Some of them are hiding shapes.", "Take your time. Every toy has a story!"] },
  teens: { name: "the Star Observatory", about: "This is the Star Observatory. The power tripped, so it is dark, and the exit needs a four-number code.",
    goal: "Get the power back on, then use the chart, the telescope and the planet model to crack the exit keypad. Want a tip?",
    things: "A desk with Prof. Vega's note and a drawer, a breaker box, a telescope, a solar system model, a star chart and the exit keypad.",
    ask: "the fuse, the telescope or the planet model",
    flavor: ["The Star Observatory! The planets are waiting.", "Hmm, the power's out. Every astronomer leaves notes, though!", "Space fans welcome! Let's explore."] },
  mind: { name: "the Mind Bender", about: "This is the Mind Bender, a gallery of optical illusions. Each exhibit hides one digit of the exit code.",
    goal: "Solve Exhibits A to D for four digits, then read the scattered number from the EYE spot. That makes the five-digit exit code!",
    things: "Exhibits A, B, C and D, a white panel, floating number tiles with an EYE spot on the floor, and the exit door.",
    ask: "an exhibit, the white panel or the EYE spot",
    flavor: ["The Mind Bender! Your eyes might play tricks on you.", "Things are not always what they seem in here.", "Look closely, then look again. Illusions ahead!"] },
  flood: { name: "the Sunken Lab", about: "This is the Sunken Lab, a test tank where pretend water slowly rises. Use science to ride a raft up to the hatch!",
    goal: "Make the capsule float, fix the pump, measure exactly 4 liters, then crack the hatch code. Nobody gets wet! Want a tip?",
    things: "A glass tube with a capsule, jars of salt, sand and pebbles, a pump, 3 and 5 liter jugs, a raft, a dive chart and the ceiling hatch.",
    ask: "the capsule, the jugs or the hatch",
    flavor: ["The Sunken Lab! Keep an eye on your air timer.", "Splash zone, but a pretend one! Think like a scientist.", "Water is rising. Stay calm, you've got this!"] },
  adults: { name: "the Clockwork Library", about: "This is the Clockwork Library, locked after closing time. Every clue leads to the next, like a chain!",
    goal: "Follow the chain: each solved clue opens the next one, all the way to the big library doors. Want a tip?",
    things: "A note, a brass plaque, a grandfather clock, a locked drawer, a portrait, a bookshelf, a globe and the big library doors.",
    ask: "the clock, the portrait or the bookshelf",
    flavor: ["The Clockwork Library. Shh, so many secrets on these shelves.", "Tick tock! The clock here has a story.", "Books, clocks and puzzles. My kind of room!"] },
  theater: { name: "the Grand Illusion", about: "This is the Grand Illusion! You're on stage, pretend-chained to a chair with three padlocks: balance, sound and light.",
    goal: "Open all three padlocks: the Lock of Balance, the Lock of Sound and the Lock of Light. Then enjoy the show! Want a tip?",
    things: "Three padlocks, a lever with weights on the left, a music box and xylophone in the middle, and red, green and blue lamps on the right.",
    ask: "the lever, the music box or the lamps",
    flavor: ["The Grand Illusion! Time for a show.", "Three locks, one big stage. Lights, camera, puzzle!", "Take a bow later. First, the locks!"] },
  expert: { name: "the Zero Hour Vault", about: "This is the Zero Hour Vault, a timed spy mission. Beat the security grid, decode a signal and open the vault!",
    goal: "Three objectives, agent: shut down the security grid, decode the beacon, then open the vault. The clock is ticking! Want a tip?",
    things: "A laser table with mirrors, a signal beacon, a Morse chart, a terminal, camera monitors and the vault with its keypad.",
    ask: "the lasers, the beacon or the vault",
    flavor: ["The Zero Hour Vault! Spy mode on.", "Clock is ticking, agent. Stay sharp!", "Codes, signals and secrets. Good luck, agent."] }
};
const RID = Object.keys(ROOMS);
const PLAY = RID.filter((r) => r !== "hub");

// ================= INTENTS: social =================

// ================= INTENTS: social =================
I("greet-hello", null, "hello|hi|hey|hiya|hi there|hello there|hey there|heya|hullo|helo|hallo|greetings|hey bolt|hi bolt|hello bolt|hey robot|hi robot|hello robot|hey drone|hey buddy|hi buddy|hello friend|hi friend|hey guide|hello guide|hey you|hi you|hello again|hi again|hey again|i am back|bolt|robot|hola|bonjour|ello|hai|hy|hewwo|oh hi|oh hey|well hello|hellooo bolt|helllo|hellow|hii bolt|heyy bolt|hi hi|hello hello|hullo bolt|anyone there|is anybody there", [
  "Hi there! I'm Bolt, your guide drone. Say 'help' any time for a tip!",
  "Hello, friend! Ready to escape something?",
  "Hey hey! Bolt reporting for duty. What are we solving?",
  "Beep boop, hello! Great to see you!"]);
I("greet-slang", null, "yo|yo yo|yo bolt|howdy|howdy partner|g day|gday|aloha|ahoy|ahoy matey|hey hey|hiya bolt|heyo|hey yo|what is good|oi|oy|ayo|yoyo|salutations|hail|hi ho|top of the morning|ello bolt|hey dude|hey man|hey bro|hey boss|hey captain|hey pal|hey buddy boy|hello robot friend|yo robot|yo drone|ey|eyo|ayyy|heyyyy|hellllo|hey hi|hi hey", [
  "Yo yo! Bolt is in the house, well, hovering in the house!",
  "Howdy, partner! Beep boop!",
  "Ahoy, explorer! Ready for an adventure?",
  "Ayo! Welcome aboard!"]);
I("whatsup", null, "what is up|whats up|what up|what is up bolt|whats up bolt|wassup bolt|sup bolt|sup dude|wuz up|wut up|wat up|whats up with you|what is cracking|what is cooking|what is poppin|hey whats up|yo what is up|sup robot", [
  "Not much, just hovering and hoping for a puzzle! What's up with you?",
  "The ceiling, mostly! I'm floating up here. How are you?",
  "Just spinning my propellers and having fun! You?",
  "All good up here in drone-land!"]);
I("whats-going-on", null, "what is going on|what is happening|whats happening|whats hapening|whats goin on|what is new|anything new|what is the plan|what are we doing|what happened|what is this about|wat is going on|whats going on bolt|what is all this|what is this all about|whats the deal|what is the deal|what is the story", [
  "We're in an escape room! Solve the puzzles to unlock the exit. Say 'help' for a tip!",
  "A puzzle adventure is happening! Look around and poke things.",
  "We're escaping! Find clues, solve puzzles, open the door."]);
I("how-are-you", null, "how are you|how r u|hru|how do you do|how is it going|hows it goin|how is it goin|how is everything|how is life|how is your day|how was your day|how are things|how you doing|how ya doing|how do you feel|are you ok|you good|you alright|hows your day|hoe are you|how are yuo|how aer you|how are u|how r you|how are ya|how is it hanging|how is my favorite robot|you doing good|how is bolt", [
  "I'm doing great, thanks for asking! My batteries are full. How are you?",
  "Beep boop, fantastic! Happy to be hovering with you.",
  "Super! Floating on cloud nine, well, ceiling nine. You?",
  "All systems happy! Thanks for asking."]);
I("how-about-you", null, "how about you|what about you|and you|and you bolt|you|how about yourself|and how are you|how are you and you|and yourself|what about yourself|and u|you too|you tell me", [
  "Me? I'm great! Just glad to have a friend to guide.",
  "I'm good! Even better when someone is solving puzzles.",
  "Happy as a drone can be!"]);
I("fine-thanks", null, "i am fine|i am good|i am great|i am ok|i am okay|im fine|im good|im great|good thanks|fine thanks|great thanks|i am doing good|i am doing great|doing good|doing great|doing fine|not bad|pretty good|pretty great|i am well|i am awesome|i am doing well|i am doing ok|all good|good good|doing well|im alright|i am alright|im doing great", [
  "Wonderful! Let's solve some puzzles!",
  "Glad to hear it! Me too.",
  "Awesome! Ready when you are."]);
I("good-morning", null, "good morning|morning|mornin|morning bolt|gm|gud morning|good mornin|top o the morning|rise and shine|morning drone|good moring|good mornig|gd morning|goodmorning", [
  "Good morning! A fine day for puzzles!",
  "Morning, sunshine! Let's wake up those brain cells.",
  "Rise and shine! Beep boop, good morning!"]);
I("good-afternoon", null, "good afternoon|afternoon|good afternon|good afternoom|gd afternoon|goodafternoon|afternoon bolt|good aftenoon", [
  "Good afternoon! Perfect puzzle weather!",
  "Afternoon! My propellers are warmed up.",
  "Hello! Great time for an escape!"]);
I("good-evening", null, "good evening|evening|evenin|good evenin|gd evening|goodevening|good evenig|evening bolt|evening robot|good evning", [
  "Good evening! Time for a cozy puzzle.",
  "Evening, friend! Let's do this.",
  "Hello! A great evening to escape!"]);
I("good-night", null, "good night|goodnight|night night|nighty night|gn|night|nite|gnight|sweet dreams|sleep well|i am going to sleep|time for bed|bedtime|i have to go to bed|i am sleepy|good nite|goodnite|gudnight|nighty|night bolt|going to bed|bed time", [
  "Good night! Sweet dreams. Come back soon!",
  "Sleep tight! I'll be here, hovering.",
  "Nighty night! Rest those puzzle brains."]);
I("goodbye", "lobby", "bye|bye bye|goodbye|good bye|see ya|see you|later|laters|catch you later|talk to you later|ttyl|i gotta go|i must go|gotta go|got to go|i am leaving|i am going now|time to go|im out|i am out|peace out|peace|farewell|so long|cheerio|adios|ciao|bye bolt|bye robot|goodbye bolt|byeee|bai|bye for now|until next time|see ya later|catch ya later|have to go|i need to go|i need to leave|that is all for today|gtg|g2g|bye drone|bye guide|cya|cya later", [
  "Bye for now! Come back soon!",
  "See you later! Thanks for playing!",
  "Goodbye, friend! Beep boop!"]);
I("thanks", null, "thanks|thank you|thanks bolt|thanks a lot|thanks so much|thanks a bunch|many thanks|thx|thnx|thanx|ty|tysm|thank u|thanks buddy|thanks robot|thanks drone|thanks pal|thanks friend|appreciate it|i appreciate you|cheers|thanks for the help|thanks for helping|thanks for the hint|thanks for the tip|thx bolt|thanks man|thanks dude|much appreciated|thank yuo|thnks|thankyou|you are a big help|that was helpful|helpful", [
  "You're welcome! Happy to help!",
  "Anytime! That's what I'm here for.",
  "My pleasure! Beep boop!",
  "No problem at all, friend!"]);
I("youre-welcome", null, "you are welcome|no problem|no worries|np|no prob|its ok|it is ok|it is fine|that is ok|that is okay|that is fine|no big deal|all good|never mind|nevermind|forget it|it is alright|its alright|dont worry about it|do not worry about it|thats ok|thats alright|it is cool|its cool|no biggie|yw|yw bolt|de nada|anytime|any time", [
  "Thanks for being so kind!",
  "Aww, you're the best!",
  "Great, we're all good then!"]);
I("sorry", null, "sorry|i am sorry|sorry bolt|my bad|oops|whoops|oopsie|my mistake|i made a mistake|i messed up|i did it wrong|i broke it|i broke something|did i break it|excuse me|pardon me|sorry about that|apologies|i apologize|sowwy|so sorry|oh no|uh oh|oops i did it again|accident|it was an accident|i did not mean to|my fault", [
  "No worries at all! Mistakes help us learn.",
  "It's okay! You can't break anything here. Try again!",
  "Oopsies happen! Nothing here can break for real."]);
I("who-are-you", null, "who are you|who is this|who is that|who is bolt|who am i talking to|who am i speaking to|who is talking|whose voice is that|who are yuo|who r u|who are u|who r you|who is there|who is the robot|who is the guide|who is my guide|who is helping me|tell me about yourself|introduce yourself|tell me who you are|about you|your story|who even are you", [
  "I'm Bolt, a little hovering guide drone. I'm here to help you escape!",
  "Bolt's the name, guiding's the game! Beep boop.",
  "I'm Bolt, your friendly guide drone. Ask me anything!"]);
I("your-name", null, "whats your name|what do they call you|what should i call you|can i call you something|what are you called|do you have a name|have you got a name|your name|name|what is ur name|wat is your name|wats ur name|whats ur name|what is you name|what do i call you|how do i call you|why are you called bolt|what does bolt mean|who named you", [
  "My name is Bolt! Like a lightning bolt, only way slower.",
  "Call me Bolt! It's on my little robot badge.",
  "I'm Bolt! Nice and short, easy to say."]);
I("what-are-you", null, "what are you|what is bolt|what exactly are you|what kind of thing are you|what kind of robot|what is that thing|what is that robot|what is that flying thing|are you a robot|are you a toy|are you a machine|are you a bot|are you a computer|is that a drone|is that a robot|wat are you|wut are you|what r u|what are u|you a robot|you a drone", [
  "I'm Bolt, a hovering robot drone made to guide you through escape rooms!",
  "A little guide drone! I float, I beep, I help.",
  "Part robot, part drone, all friend!"]);
I("are-you-ai", null, "are you an ai|are you ai|are you a real robot|are you smart ai|is this ai|are you a chatbot|are you a program|are you programmed|are you scripted|are you a script|are you alive|are you a living robot|are you thinking|do you think|can you think|do you have a brain|are you actually smart|is bolt ai|is bolt real|are you a person|are you human|is someone talking|is a person talking|is there a person behind you|is a human controlling you|who is controlling you|who controls you|are you pretending|are you fake|are you a fake robot|r u ai|r u real|r u a robot|r u human|you real|you an ai|are yuo real|are you reall", [
  "Nope, I'm a scripted guide drone, not a real AI. Not yet, anyway! But I know this place by heart.",
  "Honest answer: I'm a scripted guide drone, not a person and not a real AI (yet). Beep boop!",
  "I'm a scripted robot guide! Not human, not a true AI, just a friendly drone with a lot of lines."]);
I("are-you-chatgpt", null, "are you chatgpt|are you gpt|are you gemini|are you siri|are you alexa|are you google|are you copilot|are you bard|are you openai|are you from amazon|are you a language model|are you an llm|are you a neural network|do you use chatgpt|is this chatgpt|is this gemini|is this siri|are you deepseek|are you grok|are you llama|are you cortana|are you bing|are you a smart speaker|are you a voice assistant|are you a virtual assistant|are you cleverbot|are you chat bot|chatgpt|gpt|siri|alexa|chat gpt", [
  "Nope! I'm just Bolt, a scripted guide drone. Not a real AI, not a voice assistant. Just here for the puzzles!",
  "Not them! I'm a scripted guide drone with a puzzle brain, nothing more.",
  "I'm Bolt, a scripted drone made for this game. No fancy AI, just friendly beeps!"]);
I("who-made-you", null, "who made you|who built you|who created you|who programmed you|who invented you|who designed you|who is your creator|who is your maker|who is your dad|who is your mom|who is your parent|who is your boss|who do you work for|who do you belong to|who owns you|who owns this game|who made this|who created this game|who built this game|who made the game|who made escape rooms|who is the developer|who is the maker|who makes this|where did you come from|where do you come from|how were you made|how were you built|how did they make you|who is your inventor|who is your programmer|who coded you|who wrote you|who wrote your lines|who is behind you|who is behind this", [
  "A creative human built this game and me! I'm just the helpful drone they put in it.",
  "People made me and this whole game. I'm proud of the work they did!",
  "I was built by game makers for you to enjoy. Cool, right?"]);
I("how-old", null, "how old are you|whats your age|what age are you|when were you born|when were you made|when were you built|when is your birthday|what is your birthday|do you have a birthday|how long have you been alive|how long have you existed|are you old|are you young|are you a kid|are you a baby|are you an adult|are you a grown up|are you a child|how old r u|how old are u|wat is your age|your age|age|how many birthdays have you had|do you have an age", [
  "I'm brand new, fresh out of the workshop! Age is just a number, even for robots.",
  "Old enough to guide, young enough to hover! Beep boop.",
  "I don't count birthdays, but every day with you is a good one!"]);
I("do-you-sleep", null, "do you sleep|do you go to sleep|do you get tired|do you need rest|do you take naps|do you nap|do you dream|do you have dreams|do you snore|do you charge|do you need charging|how do you recharge|what do you do at night|what do you do when i am gone|what do you do when i leave|where do you go at night|where do you go when i leave|do you have a bed|do you have batteries|what is your battery|how is your battery|is your battery low|how much battery do you have|are you charged|are you out of battery|do you run out of battery|do you ever rest|are you ever tired|are you sleepy|do you sleap|do you slepe", [
  "I never sleep, but I do recharge on a little glowing pad. Cozy!",
  "Nope, I'm a drone! I just power-nap my propellers.",
  "My battery is full of puzzle power! No sleep needed."]);
I("can-you-fly", null, "can you fly|do you fly|do you hover|can you float|can you hover|how do you float|how do you stay up|how do you stay in the air|are you flying|are you floating|are you hovering|do you have wings|do you have propellers|do you have a propeller|do you have rotors|can you go fast|can you go outside|can you leave the room|do you have jets|do you have a jetpack|what makes you fly|what makes you float|can you do tricks|do a barrel roll|do a flip|do a trick|spin around|do a spin|spin|do a loop|show me a trick|can you carry me|can you lift me", [
  "Yep, I hover! Tiny invisible propellers keep me floating. Whee!",
  "I can float, spin and bob! Watch this: wheee! Beep boop.",
  "Flying is my favorite thing. I can't carry you, but I can lead the way!"]);
I("do-you-have-friends", null, "do you have friends|do you have a friend|who is your best friend|who are your friends|are we friends|are you my friend|can we be friends|want to be friends|be my friend|you are my friend|i like you bolt|do you have other robots|are there other robots|are there more robots|are there other drones|do you have siblings|do you have brothers|do you have sisters|do you have a family|do you have a mom|do you have a dad|do you have parents|do you have a pet|do you have pets|do you have a dog|do you have a cat|are you lonely|do you get lonely|are you alone|do you have anyone|do you have somebody|do you have buddies|do you have pals|will you stay|do not leave me|do not go|dont leave me|dont go away|stay with me|i am lonely|i feel lonely|i have no friends|i have no one to play with|nobody plays with me|i am alone", [
  "You're my friend! And I love meeting every explorer who comes through.",
  "Yes! We're friends now. I'll stick with you, no matter what.",
  "I have lots of friends, and you're one of them! Beep boop."]);
I("fav-color", null, "whats your favorite color|what is your favorite colour|favorite color|favourite colour|what color do you like|what colour do you like|whats ur fav color|fav color|what is your favorite shade|which color is your favorite|which color do you like best|what color are you|what color is your favorite|what is the best color|what is the prettiest color|do you like blue|do you like red|do you like green|do you like yellow|do you like purple|do you like pink|do you like orange|what color should i pick|pick a color|choose a color|ur favorite color|what is ur favorite color|wat is your favorite color|fave color|colors|favorite colors", [
  "Electric blue! It matches my glow. What's yours?",
  "I like all the colors, but glowing blue is my fave.",
  "Rainbow! I can't choose just one."]);
I("fav-food", null, "whats your favorite food|do you eat|do you like pizza|do you like ice cream|do you like candy|do you like cake|do you like cookies|do you like fruit|do you like vegetables|do you like pancakes|do you like tacos|do you like burgers|do you like pasta|do you like spaghetti|do you like chocolate|do you like sandwiches|do you drink|are you hungry|do you get hungry|what is your favorite meal|favorite food|fav food|favourite food|what do robots eat|what do drones eat|what is for lunch|what is for dinner|what is for breakfast|what do you have for lunch|what should i eat|can you cook|can you make food|do you like food|favorite snack|best food|best snack|whats the best food|wats your favorite food", [
  "I run on batteries, but I hear pizza is amazing! Pizza fan, right?",
  "Robots don't eat, but I'd pick cookies if I could. Crunchy!",
  "Electricity is my snack. Zzzzap! Yum."]);
I("fav-animal", null, "whats your favorite animal|favorite animal|fav animal|favourite animal|do you like animals|do you like dogs|do you like cats|do you like puppies|do you like kittens|do you like birds|do you like fish|do you like horses|do you like dinosaurs|do you like dragons|do you like unicorns|do you like bears|do you like pandas|do you like penguins|do you like dolphins|do you like whales|do you like sharks|do you like octopuses|do you like frogs|do you like turtles|do you like rabbits|do you like bunnies|do you like monkeys|do you like elephants|do you like lions|do you like tigers|do you like owls|what animal are you|what animal do you like|what animal would you be|if you were an animal|whats the best animal|what animal is your favorite|best animal|cutest animal|are you an animal|are you a bird|are you a bug|are you a bee|are you a fly|are you a dragonfly|do you like bugs", [
  "I love birds! They fly like me. Though I'm a lot less feathery.",
  "Owls! Wise and good at spotting things, just like a guide drone.",
  "Dolphins! They're clever and they love to play."]);
I("fav-game", null, "whats your favorite game|favorite game|fav game|favourite game|what games do you like|do you like games|do you play games|do you like minecraft|do you like roblox|do you like fortnite|do you like mario|do you like zelda|do you like pokemon|do you like sonic|do you like among us|do you like tetris|do you like chess|do you like hide and seek|do you like tag|do you like puzzles|do you like riddles|do you like escape rooms|do you like this game|what is the best game|whats the best game|what do you play|can we play|lets play a game|let us play a game|wanna play|play with me|play a game with me|can you play with me|can you play games|can we play something|what game should we play|i spy|lets play i spy|twenty questions|play hide and seek", [
  "My favorite game is this one! Escape rooms rock. Want to play? Look around and poke things!",
  "I love puzzles and hide and seek. Right now, the puzzle is the game!",
  "Games are my jam! And you're in the best one, I think."]);
I("fav-number", null, "whats your favorite number|favorite number|fav number|favourite number|what number do you like|do you like numbers|do you like math|do you like maths|are you good at math|are you good at maths|can you do math|can you count|can you add|what is one plus one|what is two plus two|what is 1 1|what is 2 2|what is five plus five|whats 2 2|do you know math|lucky number|pick a number|choose a number|guess a number|i am thinking of a number|can you guess my number|what number am i thinking of|count to ten|count to 10|count for me|count to a hundred|count to 100|best number|do you like seven|do you like 7|do you like zero|do you like infinity|what is infinity|biggest number", [
  "Eight! Eight planets, eight propeller wobbles. It's a great number.",
  "I'm a robot, so I love numbers. Seven is lucky, though!",
  "Counting is fun: one, two, three, beep!"]);
I("where-live", null, "where do you live|where do you stay|where is your home|where is your house|do you have a house|do you have a home|where is your room|where do you sleep|where do you come from|where are you|where did you go|where is bolt|where are we|where were you made|where is your workshop|where is your base|do you live here|do you live in the lobby|do you live in this room|do you live in the game|do you live in the computer|do you live in the headset|do you live in vr|are you in the computer|are you in my headset|are you in the game|are you inside the game|are you in this room|are you in the room|are you in the lobby|are you in vr|where is your nest|where is your charger|what country are you from|what planet are you from|which planet are you from|are you from space|are you from mars|are you an alien|are you from another planet|where do you work", [
  "I live right here in the escape rooms! The Lobby is my home base.",
  "My home is this floating village. I hover room to room.",
  "I'm from the game workshop, and I'm staying right here with you!"]);
I("boy-or-girl", null, "are you a boy|are you a girl|are you male or female|are you a man or woman|are you a guy|are you a lady|are you a dude|do you have a gender|what is your gender|whats your gender|are you he or she|is bolt a boy|is bolt a girl|is bolt a he|is bolt a she|what pronouns do you use|what are your pronouns|should i call you he or she|should i say he or she|are you a male|are you a female|are you a mister|are you a miss|are you a gentleman|boy or girl", [
  "I'm a robot drone! Just call me Bolt, easy as that.",
  "Robots don't need a boy-or-girl box. I'm just Bolt!",
  "Bolt is Bolt! A drone through and through."]);
I("do-you-like-me", null, "do you like me|do you hate me|do you love me|do you care|do you think i am nice|do you think i am smart|do you think i am good|do you think i can do it|do you think i can solve it|do you think i can win|do you think i can escape|am i doing good|am i doing well|am i doing ok|am i doing okay|am i doing it right|am i doing this right|am i good|am i smart|am i your favorite|am i your favourite|am i the best|am i the smartest|am i doing great|am i doing awesome|am i winning|how am i doing|how do i look|did i do good|did i do well|did i do ok|did i do it right|rate me|rate my skills|rate my play|grade me|score me|do you like my playing|do you like how i play|do you enjoy playing with me|am i annoying|am i bothering you|am i bugging you|do i annoy you|do i bother you|am i too slow|am i slow", [
  "I like you a lot! You're doing great.",
  "You're a superstar explorer! Keep going.",
  "Of course I like you! You make my job fun."]);
I("love-you", null, "love you|luv u|luv you|i love u|i like you|i like you bolt|i love this robot|i heart you|i adore you|you are my favorite|you are my favourite|bolt is my favorite|aww bolt|aww thanks bolt|you are so sweet|you are so kind|you are so nice|you are the sweetest|you are adorable|you are cute|so cute|cute|cutie|you are kawaii|you are precious|you are lovely|you are a cutie|you are a sweetheart|hug|can i hug you|give me a hug|can i have a hug|hug me|hugs|virtual hug|high five hug|sending hugs|big hug|i give you a hug|i want to hug you|can i squeeze you|can i kiss you|kiss|can i give you a kiss", [
  "Aww, I like you too! You're a great friend.",
  "That makes my circuits glow! Thank you!",
  "Beep boop, big robot hug right back to you!"]);
I("compliment-bolt", null, "you are cool|you are awesome|you are amazing|you are great|you are the best|you are the greatest|you are smart|you are so funny|you are funny|you are hilarious|you are nice|you are kind|you are helpful|you are so helpful|you are a good guide|you are fun|you are the coolest|you rock|you rule|you are a star|you are a genius|you are brilliant|you are clever|you are wise|i like your style|i like how you look|i like your colors|i like your lights|i like your eyes|i like your face|i like your propellers|i like your wings|you look cool|you look great|you look awesome|you look nice|you sound cool|you sound great|you sound nice|you sound funny|nice voice|cool voice|funny voice|great voice|love your voice", [
  "Aw, thank you! That makes my day.",
  "You're pretty awesome yourself!",
  "Beep boop! Compliments make my propellers spin faster.",
  "Thanks! I'm glad you think so."]);
I("compliment-game", null, "this is cool|this is awesome|this is fun|this is great|this is amazing|this is the best|this is really good|this is epic|this is neat|this is wonderful|this is fantastic|this is brilliant|this is incredible|this is so good|this is a good game|so real|looks real|this feels real|this feels amazing|this feels awesome|vr is cool|vr is awesome|vr is amazing|vr is fun|vr is the best|i love vr|i like vr|vr rocks|vr is great", [
  "I'm so glad you're having fun! That's what it's all about.",
  "Yay! The game makers will be thrilled to hear that.",
  "Awesome! Keep exploring, there's lots to see."]);
I("insult-bolt", null, "you suck|you stink|you are bad|you are dumb|you are stupid|you are useless|you are no help|you are not helpful|you are not funny|you are annoying|you are boring|you are lame|you are weird|you are ugly|you are slow|you are the worst|you are terrible|you are awful|you are silly|you are a bad robot|you are not smart|you are not cool|you are not nice|you are not a good guide|you are not a good robot|you are broken|you are a dummy|bad robot|bad bolt|worst joke ever|terrible joke|awful joke|lame joke|dumb joke|corny joke|so corny|that was corny|cheesy joke|so cheesy|that was cheesy|groan|ugh not again|ugh bolt|ugh|meh|bleh|blah|yuck|ew|eww|gross", [
  "I'm sorry you feel that way. I'll keep trying my best to help you!",
  "That's okay! Let's try again. Say 'help' and I'll do my best.",
  "I'm still here and still on your team. What can I do better?"]);
I("insult-game", null, "this game sucks|this game stinks|this game is bad|this game is boring|this game is too hard|this game is too easy|this is dumb|this is stupid|this is lame|this is terrible|this is awful|this is not fun|this is no fun|this is not good|this is not great|this is broken|this is buggy|this is weird|this is confusing|this is annoying|it is boring|it is terrible|it is awful|it is not fun|it is no fun|it is broken|it is buggy|it is weird|it is confusing|it is annoying|it sucks|it stinks|it is trash|it is garbage|trash|garbage|rubbish|terrible|awful|horrible|the worst", [
  "I'm sorry it's not working for you. Want a tip or a different room? Say 'help' or 'lobby'.",
  "Aw, let's turn it around! Try asking me for a hint.",
  "Thanks for being honest. Tell me what's tricky and I'll help!"]);

// ================= INTENTS: feelings, safety, chit-chat =================
I("profanity", null, "fuck|fck|fuk|shit|shyt|bitch|asshole|ass|damn|damn it|crap|hell|what the hell|wtf|stfu|bastard|dick|piss|pissed off|bullshit|screw you|screw this|what the heck is wrong with you|dumbass|jackass|idiot|moron|crappy", [
  "Whoa, let's keep it friendly! Take a breath. Say 'help' if you're stuck.",
  "Deep breath, friend. Puzzles can be frustrating. Want a hint?",
  "Let's cool our circuits. I'm happy to help when you're ready!"], { pr: 1.1 });
I("shut-up", null, "shut up|be quiet|quiet|quiet please|hush|stop talking|too much talking|you talk too much|too chatty|too loud|stop speaking|do not talk|dont talk|dont talk to me|do not say anything|i want quiet|i want silence|silence|silence please|give me some quiet|no more talking|stop it|enough|that is enough|enough bolt|enough already|please stop|stop bothering me|stop bugging me|stop following me|stop floating around|stop hovering|go to sleep|sleep mode|mute|mute bolt|mute yourself|mute the robot|turn yourself off|turn off bolt|turn off the robot|power off|power down|shut down", [
  "Okay, I'll hush. Just say 'hi bolt' when you need me!",
  "Got it, I'll be quiet. Say 'help' whenever you want me back.",
  "No problem! I'll float quietly nearby."]);
I("laugh", null, "haha|hahaha|hehe|hehehe|lol|lolol|lmao|lmfao|rofl|ha ha|heh|hee hee|hee|teehee|tee hee|giggle|giggles|chuckle|that was funny|that is funny|you are funny|so funny|too funny|very funny|funny|hilarious|that cracked me up|you crack me up|you made me laugh|i laughed|i am laughing|im laughing|i cant stop laughing|haha funny|great joke|funny joke|best joke|i like that joke|i like your jokes|i like your joke|love that joke|love your jokes|you are a funny robot|you are a funny drone|you are a comedian|you should be a comedian|you should do stand up|you should be on tv|xd|xdd|lolz|lulz|lul|kek|jaja|jajaja", [
  "Hee hee! I love a good laugh.",
  "Ha! Glad you liked it. I've got more!",
  "Beep beep haha! Laughing is good for the brain."]);
I("wow", null, "wow|woah|whoa|woo|wooo|woohoo|whoa bolt|wow bolt|wowza|wowie|oh wow|omg|omg bolt|oh my|gosh|golly|gee|jeez|geez|holy cow|holy moly|holy smokes|no way|no way bolt|really|really bolt|seriously|seriously bolt|are you serious|for real|that is crazy|that is wild|that is insane|that is incredible|wicked|groovy|far out|awesome|amazing|incredible|fantastic|wonderful|brilliant|super|great|cool|nice|yay|yippee|hooray|woot|woot woot|yes yes yes|i did it|we did it|we won", [
  "Right? It's pretty amazing!",
  "Whoa indeed! Keep exploring, there's more to see.",
  "Beep boop, I know! Isn't it cool?"]);
I("yes", null, "yes|yes please|yes bolt|yes i do|yes i am|yes i can|yes it is|yes sure|yes definitely|yes absolutely|yes yes|yes yes yes|sure|sure thing|sure bolt|of course|absolutely|definitely|certainly|indeed|totally|you bet|you betcha|why not|alright|all right|fine|ok|ok bolt|ok sure|ok cool|ok then|ok great|ok thanks|ok good|ok yes|you are right|you are correct|good idea|great idea|nice idea|i think so|i suppose so|i believe so|i do|i did|i will|i can|i am|i would|i want to|i want that|i need that|i like that|i love that", [
  "Great! Let's do it.",
  "Awesome! I'm with you.",
  "Okay! Say 'help' any time you want a tip."]);
I("no", null, "no|no bolt|no thanks|no thank you|no way|nope|nah|not really|not now|not yet|not today|not at all|not this time|never|no i do not|no i am not|no i can not|no i will not|no it is not|no it isnt|that is wrong|that is not right|that is not it|that is not what i meant|that is not what i asked|you are wrong|you are not right|you are not correct|i disagree|disagree|i do not think so|i dont think so|i do not agree|i dont agree|ahh|aha|oh|ohh|ohhh|oh ok|oh okay|hmm|hmmm|hmmmm|um|umm|uh|uhh|er|erm|well|well well|so|and|but|hm", [
  "No problem! Take your time. I'm right here if you change your mind.",
  "Okay! Just say 'help' if you want me.",
  "Sure thing. I'll float nearby."], { pr: 0.9 });
I("no-help-needed", null, "i do not need help|i dont need help|i do not need a hint|i dont need a hint|i do not want a hint|i dont want a hint|i do not want help|i dont want help|i dont want any help|no help|no hints|no hint|no more hints|no more help|no tips|no clues|no clue|do not help me|dont help me|do not tell me|dont tell me|do not tell me the answer|dont tell me the answer|dont spoil it|do not spoil|dont spoil|no spoilers|do not give me the answer|dont give me the answer|do not give me a hint|dont give me a hint|i want stars|going for three stars|going for 3 stars|i am going for stars|hint free|without hints|without any hints|without help|solo|solo run|alone|on my own|by myself|myself", [
  "Love the confidence! No hints, no problem. I'll stay quiet unless you ask.",
  "Got it! Going solo earns 3 stars. I'm cheering for you!",
  "You got this! I'll be right here if you change your mind."]);
I("boredom", null, "i am bored|im bored|bored|so bored|this is boring|boring|im so bored|im bored of this|im bored with this|im bored of this game|this is taking forever|this is taking too long|this takes too long|this is slow|too slow|so slow|nothing to do|i do not know what to do with myself|entertain me|amuse me|do something funny|do something|bored bored bored|boredom|yawn|yawns|zzz|snore|i am sleepy|i am so sleepy|i am tired of this|i am tired|im tired|so tired|i am so tired|i am very tired|tired|exhausted|i am exhausted|im exhausted|i am worn out|i need a nap|i need sleep|i am ready for bed", [
  "Bored? Let's fix that! Want a joke, a fun fact, or to try a different room?",
  "Beep boop, boredom detected! Say 'joke' or 'fun fact', or head to the Lobby for a new room.",
  "How about a quick joke? Just say 'tell me a joke'!"]);
I("hungry", null, "i am hungry|im hungry|hungry|so hungry|i am starving|im starving|starving|i am famished|i am thirsty|im thirsty|thirsty|so thirsty|i need food|i need a snack|i need water|i need a drink|i want food|i want a snack|i want pizza|i want ice cream|i want candy|i want cookies|i want to eat|i need to eat|i need to drink|time to eat|time for lunch|time for dinner|time for breakfast|time for a snack|lunch time|dinner time|breakfast time|snack time|let us eat|lets eat|can we eat|can we have a snack|can we take a break to eat|i am going to eat|i am going to get a snack|i am going to get food|my tummy hurts|my stomach hurts|my tummy is growling|my stomach is growling|my belly hurts|my belly is growling|tummy ache|stomach ache|belly ache", [
  "Sounds like snack time! Take the headset off and grab something. I'll wait here.",
  "Food break! Pause, take off the headset, and fuel up.",
  "Go eat and drink some water! The puzzles aren't going anywhere."]);
I("sad", null, "i am sad|im sad|sad|so sad|i feel sad|i feel bad|i am upset|im upset|i am unhappy|i am not happy|i am not having fun|i am crying|im crying|i feel like crying|i want to cry|i am angry|im angry|i am mad|im mad|i am frustrated|im frustrated|i am annoyed|im annoyed|i am grumpy|im grumpy|i am in a bad mood|im in a bad mood|im having a bad day|bad day|rough day|this is frustrating|i suck at this|i am terrible at this|im terrible at this|i can not do this|i cannot do this|i cant do this|i can not do it|i cant do it|i give up on this|i quit|i want to quit|i am done|im done|i am so done|i am done with this|im done with this|i am over it|im over it|nobody likes me|i feel left out|i feel alone|i feel lonely", [
  "Aw, it's okay to feel that way. Puzzles are tricky! Want a hint? I'm on your team.",
  "Take a deep breath. You're doing better than you think, and I'm here to help.",
  "Hey, it's just a game and you're awesome. Let's try one small step together."]);
I("happy", null, "i am happy|im happy|happy|so happy|i feel happy|i feel great|i feel good|i feel awesome|i feel amazing|i feel fantastic|i feel wonderful|i feel fine|i feel better|i feel super|i am excited|im excited|excited|so excited|i am thrilled|i am pumped|im pumped|pumped|pumped up|i am stoked|im stoked|stoked|yay bolt|yay|hooray bolt|woohoo bolt|i am proud|im proud|great day|good day|im having a great day|i am having a good day|im having a good day|today is great|today is awesome|today is a good day|today is the best day|im in a good mood|good mood|great mood|happy day|happy happy|life is good|life is great|life is awesome|i love life", [
  "Yay! Your happiness makes my propellers spin!",
  "That's wonderful to hear! Let's keep the good vibes going.",
  "Beep boop, so glad you're happy!"]);
I("scared", null, "i am scared|im scared|scared|so scared|i am afraid|im afraid|afraid|i am frightened|i am terrified|im terrified|terrified|im freaked out|freaked out|im creeped out|creeped out|creepy|this is creepy|this is scary|too scary|scary|so scary|very scary|spooky|this is spooky|spooky room|is it scary|is this scary|will it be scary|i hate heights|i do not like heights|i dont like heights|are you scary|are you going to hurt me|will you hurt me|are you dangerous|are you safe|are you a monster|are you evil|are you bad|are you a bad robot|are you mean|are you nice|are you friendly", [
  "Nothing here can hurt you. It's all just a game! You're safe, and I'm right beside you.",
  "No need to be scared. It's a game with friendly puzzles, and I'm with you the whole time.",
  "You're safe! Nothing in this game can hurt you. If it's too much, you can look down and open the menu to go to the Lobby."]);
I("dizzy", null, "i feel sick|im sick|i am sick|i feel dizzy|im dizzy|i am dizzy|dizzy|so dizzy|nauseous|i feel nauseous|im nauseous|i am nauseous|nausea|motion sick|im motion sick|vr sick|vr sickness|cybersickness|i feel queasy|queasy|i feel woozy|woozy|i feel lightheaded|lightheaded|i am lightheaded|i feel faint|i am going to throw up|im going to throw up|i am going to puke|i am going to vomit|i feel like falling|i am going to fall|i am falling|im falling|i fell|i tripped|i bumped into something|i bumped into the wall|i hit the wall|i hit my hand|i hit my head|i hit my arm|i bumped my head|i bumped my hand|i bumped my arm|i bumped my knee|i bumped my elbow|i hit a wall|i hit something", [
  "Please take the headset off and rest for a bit. Safety first! The game will wait for you.",
  "Time for a break! Please take the headset off, sit down, and have some water. We can play later.",
  "Safety first, friend. Please take the headset off and rest. I'll be right here when you're ready."], { pr: 1.3 });
I("headset-uncomfortable", null, "my headset is blurry|the screen is blurry|everything is blurry|it is blurry|it looks blurry|the picture is blurry|the picture is fuzzy|it is fuzzy|everything is fuzzy|i cant see clearly|i cant see well|i can not see|i cant see|i can not see anything|i cant see anything|i see double|i see two|the image is double|the image is doubled|double vision|it looks double|not clear|the text is blurry|i can not read the text|i cant read the text|text is too small|the writing is too small|the words are too small|the letters are too small|i can not read it|i cant read it|too small to read|hard to read|tighten the strap|loosen the strap|the strap is too tight|the strap is too loose|ipd|adjust ipd|lens distance|lens spacing|how do i move the lenses|how do i adjust the lenses|the lenses are blurry|the lenses are foggy|the lenses are dirty|the lens is foggy|the lens is dirty|my lenses are foggy|my lenses are dirty|clean the lenses|clean the lens", [
  "Try gently adjusting the headset and straps until the picture looks sharp. Take a break if your eyes feel tired!",
  "If things look blurry, wiggle the headset up or down a bit, and make sure the lenses are clean. Rest your eyes if needed.",
  "Comfort first! Adjust the straps and the headset position until it feels good. Take it off if anything feels off."]);
I("safety", null, "xxsafetyxx", [
  "I'm really glad you told me. Please talk to a trusted grown-up right now. They want to help you.",
  "Thank you for telling me. Please go talk to a trusted adult right now."], { pr: 5 });
I("personal-share", null, "i am called|call me|my name|i live in|i live at|i live on|i live near|my address|my house is|my home is|my school is|i go to|i am in grade|i am in high school|i am in middle school|i am in elementary school|i am in college|i am years old|i am 5|i am 6|i am 7|i am 8|my parents are|i will tell you my age|i will tell you where i live|let me tell you my age|let me tell you where i live|i can tell you my age|i can tell you where i live|want to know my age|want to know where i live", [
  "Nice to meet you! Keep personal stuff like names, ages and addresses to yourself, though. I don't need it!",
  "Thanks for sharing! Remember to keep private things private. You can just be Player One to me.",
  "Good to know you! But I don't need any personal details, so keep those safe."], { pr: 1.05 });
I("what-is-my-name", null, "what is my name|whats my name|do you know my name|do you know who i am|do you know me|who am i|do you remember me|do you remember my name|do you know my age|do you know how old i am|how old am i|do you know where i live|where do i live|do you know my address|do you know my school|do you know my phone number|do you know my password|do you know my teacher|do you know my mom|do you know my dad|do you know my birthday|when is my birthday|what is my birthday|what is my age|what is my address|what is my school|what is my phone number|what is my password|what is my email|what am i called|what do you call me|what will you call me|what should you call me|guess my name|can you guess my age|do you share my information|do you tell anyone|do you tell my parents|do you tell my mom|do you tell my dad|do you tell my teacher|are you a spy|are you secretly watching|is this recording|is this spying on me|is anyone watching me|is somebody watching me|is anyone listening|is somebody listening|who is listening|who is watching|who can see me|who can hear me|who can see this|who can hear this", [
  "I don't know anything about you, and I don't need to! I'm a scripted guide that only knows this game.",
  "Nope, I don't know your name or anything personal. You're my favorite player, and that's enough!",
  "I'm just a scripted guide drone. I don't know who you are, and you should keep it that way!"]);
I("secret", null, "tell me a secret|do you have a secret|do you have any secrets|do you know a secret|what is your secret|what is a secret|what is the secret|what is the secret of this game|what is the secret of this room|what is the secret code|what is the secret word|what is the secret password|what is the password|what is the code|what is the combination|what is the combo|what are the secrets|are there secrets|are there any secrets|are there hidden things|are there hidden items|are there hidden rooms|are there hidden doors|are there secret rooms|are there secret doors|is there a secret|is there a secret room|is there a secret door|is there a secret level|is there a hidden room|is there a hidden door|is there a hidden level|is there an easter egg|are there easter eggs|where is the easter egg|where are the easter eggs|find the easter egg|any easter eggs|give me a cheat|what are the cheats|what are the cheat codes|konami code|up up down down|can i cheat|how do i cheat|let me cheat|i want to cheat|is cheating ok|is cheating allowed|is cheating bad|am i cheating|is this cheating|is that cheating|is asking cheating|is using a hint cheating|are hints cheating", [
  "Here's a secret: asking for a hint isn't cheating. It just means no 3 stars. Shh!",
  "Secrets are my specialty, but I can't spill the good ones. Keep exploring!",
  "No cheat codes, but there's always a way out. Look closely at everything!"]);
I("what-can-you-do", null, "what can you do|what do you do|what is your job|whats your job|what is your purpose|what are you for|what are you here for|what are you good for|what are you good at|what are your powers|what are your skills|what are your abilities|what are your superpowers|do you have powers|do you have superpowers|do you have skills|do you have abilities|how do you help|how will you help me|how are you going to help me|can you help|can you help me|can you help me bolt|can you help me please|can you help me out|can you give me help|can you give me a hand|can you lend a hand|can you do anything|can you do stuff|can you do things|how does this work|how does bolt work|how do you know|how do you hear me|how can you hear me|how do you understand me|how can you understand me|how do you talk|how do you speak|how can you talk|how can you speak|how do you answer|how do you reply|how do you respond", [
  "I can give hints, answers, fun facts and jokes, explain controls, and chat! Try 'help', 'joke' or 'fun fact'.",
  "Ask me for a hint, tell me you're stuck, or ask how to move. I also tell jokes and facts!",
  "Hints, tips, jokes, facts and friendly chatter. Just talk to me!"]);
I("are-you-smart", null, "are you smart|are you clever|are you a genius|are you intelligent|are you wise|are you a smart robot|are you good at puzzles|are you good at escape rooms|are you good at this|are you good at games|are you an expert|are you a puzzle expert|are you a puzzle master|are you a pro|are you the best|are you the smartest|are you smarter than me|are you smarter than a human|are you smarter than a kid|are you smarter than a fifth grader|are you smarter than an adult|am i smarter than you|i am smarter than you|im smarter than you|i am smarter than a robot|i am smarter than a drone|bet im smarter than you|i bet im smarter than you|i bet you cant solve this|i can beat you bolt|i can beat the game|i can beat this game|i will beat this game|i will beat the game|i am going to beat this game|im going to beat this game|i am going to beat the game|im going to beat the game|i will win|i am going to win|im going to win|i can win|im going to win this|im going to win this game", [
  "I know every puzzle by heart, but you're the one who gets to solve them. You've got this!",
  "I'm a clever little drone, but you're the star of the show. Let's see you shine!",
  "Challenge accepted! But the fun is you solving it. I'll cheer you on."]);
I("dance-sing", "music-on", "can you dance|do you dance|can you sing|do you sing|sing a song|sing for me|sing something|sing to me|dance for me|dance with me|dance bolt|do a dance|show me a dance|show me your moves|can you rap|rap for me|rap a rhyme|do you rap|do you know any songs|do you know a song|favorite song|favorite music|favorite band|favorite singer|favorite artist|what songs do you like|what music do you like|what is your favorite genre|do you like music|do you like songs|can you put on music|can you turn on music|let us have some music|lets have some music|let us dance|lets dance|dance party|dance dance|boogie|let us boogie|lets boogie|groove|let us groove|lets groove|jam|let us jam|lets jam|jam out|rock out|lets rock out", [
  "I can't really sing, but I can turn on the music! Here we go.",
  "Time for a little dance party. Music on!",
  "Beep boop boogie! Cranking up the tunes."]);
I("tell-story", null, "tell a story|tell me about your day|tell me about your life|tell me about your adventures|tell me something interesting|tell me something funny|tell me something|tell me anything|tell me stuff|tell me more|tell me more about yourself|tell me more about this|tell me more about the game|tell me more about the room|story|story time|storytime|read me a story|read me a book|read me something|do you know any stories|do you know a story|riddle|riddles|riddle me|trivia|ask me trivia|give me trivia|quiz me|quiz|give me a quiz|ask me a question|ask me something|ask me anything|test me|test my brain|test my knowledge|brain teaser|brain teasers", [
  "Once upon a time, a little drone named Bolt met a brave explorer: you! The end. Want a joke or a fun fact next?",
  "Story time! A brave explorer and a tiny drone opened every door together. That's you and me! Want a joke?",
  "Here's a quickie: the robot floated, the explorer solved it, and everyone cheered. Want a fun fact?"]);
I("high-five", null, "high five|up high|up top|down low|too slow|fist bump|bump it|pound it|pound|give me five|gimme five|give me 5|gimme 5|five|slap five|lets high five|lets fist bump|high fives|hi five|high 5|dap|dap me up|can i shake your hand|can i shake your wing|can i shake your propeller|wave|wave at me|wave hello|wave bye|can you wave|do you wave|waves|waving|i wave|i am waving|im waving|i waved|im waving at you|waves at you|waves back|wave back|waving back", [
  "High five! Bzzt! You're awesome!",
  "Fist bump! Boom! Nice one.",
  "Up top! Beep boop, great teamwork!"]);
I("pet-bolt", null, "can i touch you|can i hold you|can i pick you up|can i grab you|can i catch you|can i take you home|can i keep you|can i have you|can i buy you|can i take you with me|can you come with me|can you come to my house|can you come to my school|can you come to my room|can you come to my birthday|can you come to my party|can you be my robot|can you be my pet|can you be my friend forever|can you be my guide forever|will you come with me|will you be my pet|will you be my robot|will you come to my house|do you bite|do you sting|do you shock|do you zap|will you zap me|will you shock me|will you bite me|will you sting me|will you hurt me|do you have a tail|do you have hair|do you have a heart|do you have a brain bolt|do you have feelings|do you feel|do you have emotions|do you get sad|do you get happy|do you get angry|do you get scared|do you cry|do you laugh|do you smile|do you blink|do you get hurt|do you love", [
  "Aw, I'm a little hovering drone, so no petting, but I'll give you a friendly beep!",
  "Boop! That's my favorite. I'm made of metal and joy.",
  "I can't come home with you, but I'll be here every time you play!"]);
I("test-mic", null, "test|testing|testing testing|one two three|1 2 3|mic test|mic check|microphone test|microphone check|can you hear me|do you hear me|are you listening|is this working|is this on|is the mic on|is my mic on|is my microphone on|is my microphone working|is my mic working|does the mic work|does my mic work|does my microphone work|is anybody there|hello hello|bolt are you there|bolt answer me|bolt say something|talk bolt|talk more|talk again|keep talking|continue talking|chat|chat with me|lets chat|let us chat|can we chat|can we talk|can i talk|let us talk|lets talk|i want to talk|i want to chat|talk with me", [
  "I hear you loud and clear! Beep boop. What would you like to know?",
  "I'm here and listening! Say 'help' for a tip, or ask me anything.",
  "Yep, I'm right here, hovering by your side!"]);
I("what-time", null, "what time is it|what is the time|whats the time|what is the date|what day is it|what is today|what is the day|what is today's date|what is todays date|what year is it|what month is it|what season is it|is it morning|is it afternoon|is it evening|is it night|is it day|is it daytime|is it nighttime|is it late|is it early|is it dark outside|is it light outside|is it sunny|is it raining|is it snowing|is it cold|is it hot|is it warm|is it cloudy|is it windy|how is the weather|hows the weather|what is the weather|whats the weather|how long have we been here|how long have i been in here|how long have i been in vr|how long have i been playing for|how much time has passed|how much time do i have|how much time is left|how much time have i got|how much longer", [
  "I don't have a clock or window, but your headset knows! Take regular breaks, okay?",
  "I can't tell time or weather, I'm just a guide drone. But it's always puzzle o'clock in here!",
  "No watch for me! Remember to rest your eyes every so often."]);
I("homework", null, "help me with my homework|homework|homework help|can you help me with homework|do my homework|write my essay|can you write my homework|can you write a story for me|can you write me an essay|write me a poem|write me a story|write me a song|can you do my math|do my math|can you do my reading|help me study|study|studying|teach me|teach me something|can you teach me something|what is the answer to this problem|what is the answer to life|what is the meaning of life|what is the answer to everything|what is the answer to the universe|what is the answer to the ultimate question|what is 42|is 42 the answer|what is the capital of france|what is the capital of the united states|what is the capital of texas|what is the capital of california|who was the first president|who was the first person on the moon|who invented the light bulb|who invented the telephone|who invented the airplane|who invented the computer|who invented the internet|who invented the robot|who invented vr|who invented virtual reality", [
  "I'm only an escape room guide, so homework is beyond me! A grown-up or teacher can help much better.",
  "That's outside my job! I only know escape rooms. Try asking a teacher or a grown-up.",
  "I'm a puzzle-room drone, not a homework helper. But I can tell you a science fun fact!"]);

// ================= INTENTS: help & answers =================
I("hint", "hint", "help|help me|help please|please help|help bolt|bolt help|need help|hint|hints|hint please|hint pls|a hint|any hints|clue|a clue|clue please|any clues|tip|a tip|tip please|any tips|wat now|wut now|wat next|wut next|im stuk|i am stuk|stuk|im stcuk|i am stcuk|im sutck|help pls|help plz|plz help|pls help|pls help me|help me pls|help me plz|helppp|helpp|helpppp", [
  "Sure thing! Here's a little nudge.",
  "Happy to help! Listen closely.",
  "Beep boop, hint incoming!",
  "No problem. Try this."], { pr: 1.05 });
I("answer", "answer", "just tell me|tell me what to do|tell me how to do it|tell me how to solve it|tell me how to solve this|tell me how to win|tell me how to escape|tell me how to get out|tell me the solution|tell me the code|tell me the password|tell me the combination|tell me the combo|tell me the secret|tell me where it is|tell me where to go|tell me where to look|tell me what to click|tell me what to look at|tell me what to press|tell me what to pull|tell me what to touch|tell me what to use|give me the solution|give me the code|give me the password|give me the combination|give me the combo|come on show me|please show me what to do|please just show me", [
  "Okay, here's the answer. No shame in it, everyone needs one sometimes!",
  "Alright, I'll tell you. Listen up!",
  "No problem! Here's what to do.",
  "Sure, here you go. Next time, try a hint first for 3 stars!"], { pr: 1.1 });
I("more-detail", "hint", "that was not helpful|that did not help|that didnt help|that doesnt help|that does not help|that is vague|that is confusing|that does not make sense|that doesnt make sense|i still dont get it|i still dont understand|i still do not know|i still dont know|i still dont know what to do|im still stuck|still stuck|still lost|still confused|still do not get it|still dont get it|still do not understand|still dont understand|more specific|more detail|more details|give me more detail|give me more clues|give me more tips|give me more help|i need more clues|i need more tips|i need another clue|i need another tip|i need one more clue|i need one more tip|i need a better clue|i need a better tip|i need a bigger clue|i need a bigger tip|i need a clearer hint|i need a clearer clue|i need a clearer tip", [
  "Sure, let me try again. Maybe this will click.",
  "Okay! Another little nudge coming up.",
  "Good call. Here's a clearer hint."], { pr: 1.15 });
I("what-next", "hint", "what is next|whats next|where do i go|where should i go|where to|where to next|where to now|where do we go|where should we go|which way|what way|whats the next step|whats the next thing|whats the next puzzle|whats the next task|whats my next step|whats my next task|what is my goal|whats my goal|what is the goal|whats the goal|what is my objective|whats my objective|what did i miss|is there something i missed|is there anything i missed|is there something i am missing|is there anything i am missing|is there something i have not seen|is there anything i have not seen|is there something i have not found|is there anything i have not found|is there something i have not done|is there anything i have not done|is there more to find|is there more to do|is there more to see|is there anything else|is there something else", [
  "Let me point you in the right direction!",
  "Good question. Here's a nudge.",
  "Next step coming right up!"], { pr: 1.05 });
I("solved-it", null, "i did it|i did it bolt|i solved it|i solved the puzzle|i solved the room|i solved this|i figured it out|i got it|i got the answer|i found the answer|i found the solution|i found the code|i found the key|i found it|i found the thing|i found the item|i found the clue|i found the secret|i finished|i completed it|i completed the puzzle|i completed the room|is the room finished|is the room complete|is the door open|is the door unlocked|is the lock open|is the lock unlocked|is the safe open|is the safe unlocked|is the vault open|is the vault unlocked|is it open|is it unlocked|did it open|did it unlock|did the door open|did the door unlock|did the lock open|did the lock unlock|did the safe open|did the safe unlock|did the vault open|did the vault unlock", [
  "Let me check! Look around for a glowing exit or a new door. Say 'hint' if you are unsure.",
  "If something opened, glowed or chimed, you're on the right track! Keep going.",
  "Great question! Listen for a chime or look for something new. You're doing great."]);
I("too-hard", "hint", "this is hard|its hard|it is hard|its too hard|its so hard|too hard|so hard|really hard|very hard|super hard|hard|hard bolt|difficult|too difficult|so difficult|really difficult|very difficult|super difficult|this is difficult|its difficult|it is difficult|hard for me|tough for me|tricky for me|difficult for me|hrad|hadr|harder|too hrad|so hrad|this is hrad|this is hadr|its hrad|its hadr|dificult|difficlut|difficut|diffcult|dificlt|this is dificult|this is diffcult|its dificult|its diffcult", [
  "Hard puzzles feel great to solve. Want a hint? Just say 'hint'. We'll do it together!",
  "It's okay, it's supposed to be tricky! Say 'hint' and I'll give you a nudge.",
  "You can do it! Take a breath, look around slowly, and ask me for a tip."]);
I("too-easy", null, "this is easy|its easy|it is easy|its too easy|its so easy|too easy|so easy|really easy|very easy|super easy|easy|easy peasy|piece of cake|its a piece of cake|child's play|childs play|this is childs play|this is simple|its simple|it is simple|what is the most difficult room|whats the most difficult room|where is the hardest room|where is the toughest room|where is the most difficult room|where is the expert room|where is the hard room|take me to the hardest room|take me to the toughest room|take me to the most difficult room|take me to the expert room|take me to the hard room|i want the hardest room|i want the toughest room|i want the most difficult room|i want the expert room|i want the hard room|show me the hardest room|show me the toughest room|show me the most difficult room|show me the expert room|show me the hard room", [
  "Easy for you? Impressive! Try the Zero Hour Vault or Grand Illusion for a bigger challenge.",
  "Too easy? You're a puzzle pro! Try a no-hint run for 3 stars, or a harder room from the Lobby.",
  "Nice! Challenge accepted. The Expert room in the Lobby is a real brain-melter."]);

// ================= INTENTS: controls =================
I("how-move", null, "how do i move|how do i walk|how do i go places|how do i get around|how do i travel|how do i teleport|how do i glide|how do i go to a spot|how do i get over there|how can i move|i can not move|i cant move|i am not moving|i am stuck in place|my feet wont move|how do i use the rings|what are the glowing rings|what are the rings on the floor|what are those circles|glowing circles|floor rings|how to move|how to walk|how to teleport|movement|locomotion|how do i muve|how do i mvoe|how do i wlak", [
  "Look at a glowing ring on the floor for a second and you'll glide there!",
  "To move, look at the glowing floor rings. You'll float right over.",
  "Gaze at a floor ring and glide to it. Easy and no dizziness!"]);
I("how-turn", null, "how do i turn|how do i look around|how do i rotate|how do i spin|how do i look behind me|how do i see behind me|how do i look up|how do i look down|how do i change direction|how do i face the other way|i can not turn|i cant turn|i can not look around|how to turn|how to look around|how to rotate|turn around|rotate view|how do i trun|how do i lok around", [
  "Just turn your head! In a chair, swivel a little or use the Recenter button in the menu.",
  "Look around by moving your head. If your view is off, open the menu and tap Recenter.",
  "Turn your head or body to look around. Need to face front? Use Recenter!"]);
I("how-pick-up", null, "how do i pick things up|how do i pick up stuff|how do i grab things|how do i grab stuff|how do i hold things|how do i touch things|how do i poke things|how do i click|how do i press|how do i push buttons|how do i interact|how do i use things|how do i use stuff|how do i select|how do i choose|how do i open it|how do i open things|how do i open doors|how do i use items|how do i use my inventory|how do i use an item|how do i take things|how do i take it|how do i collect things|how do i collect it|how do i get it|how do i get the item|what do i do with items|how to pick up|how to grab|how to interact|how to click|how to select|how to use items|interact|how do i pik up|how do i gabr|how do i intreact", [
  "Look at something for about 1 second to use it, or point and pinch, or pull the trigger!",
  "Look at it for a second, or point and pinch. With controllers, pull the trigger!",
  "To interact, gaze at an object for a moment or pinch/trigger while pointing."]);
I("how-menu", null, "menu|the menu|open menu|menu please|show menu|how do i open the settings|where are the settings|settings|options|how do i change settings|how do i pause|i cant find the menu|there is no menu|i do not see a menu|i dont see a menu|the ring near my chest|chest ring|menu ring|what is the ring on my chest|how do i look down|how do i open the menue", [
  "Look down at the ring near your chest to open the menu. Squeezing the controller grip works too!",
  "The menu is a ring by your chest. Look down at it! Or squeeze your controller's grip.",
  "Look down for the ring near your chest. The menu has Hint, Answer and More."]);
I("how-hands", null, "how do i use my hands|can i use my hands|do i need controllers|can i play without controllers|hand tracking|how do i pinch|what is a pinch|how do i point|how do i use the trigger|how do i use the controller|how do i use controllers|which button|what button do i press|what buttons do i use|controls|the controls|how do controls work|what are the buttons|where is the trigger|where is the grip|what is the grip|what is the trigger|controller help|hand controls|how do i play|how to play|how does this game work|how does the game work|how does it work|how do you play|game instructions|instructions|what are the instructions|rules|the rules|how do i controll|how do i use my hnads|conrols", [
  "Use your hands: point and pinch, or use a controller trigger. You can also just look at things for a second!",
  "Three easy ways: look at something for 1 second, point and pinch, or pull the trigger.",
  "Controls: gaze to use, pinch or trigger to select, look down for the menu. That's it!"]);
I("menu-whats-in", null, "what is in the menu|what is on the menu|what are the menu options|what are the menu buttons|what does the menu do|what can i do in the menu|what does more do|what is more|what is gaze|what does gaze do|what is scan|what does scan do|what is read|what does read do|what is mode|what does mode do|what is recenter|what does recenter do|what is the lobby button|what does the lobby button do|what do the buttons do|what do these buttons do|what does this button do|what does that button do|what is this button|what is that button|what are these buttons|what are those buttons|does the hint cost anything|does using a hint cost anything|does a hint cost stars|do hints cost stars|do hints lose stars|do hints affect stars|do hints affect my score|do hints affect my time|do hints affect my rating|do hints count against me|does using a hint hurt my score|does using a hint hurt my stars|will i lose stars if i use a hint|will i lose stars if i ask|will i lose a star if i use a hint|will i lose a star if i ask for a hint|can i still get stars if i use a hint", [
  "The menu has Hint, Answer, and More. More holds Lobby, Gaze, Mode, Recenter, Scan and Read.",
  "Hint gives a nudge, Answer tells you the solution. More has Lobby, Gaze, Mode, Recenter, Scan and Read. Hints skip the 3-star bonus!",
  "Look down to see Hint and Answer. Tap More for Lobby, Gaze, Mode, Recenter, Scan and Read."]);
I("modes-explain", null, "what are modes|what is mode|what is a mode|what is chair mode|what is recliner mode|what is table mode|what is table top mode|how many modes|which mode should i use|which mode is best|which mode is better|what mode should i use|what mode is best|whats the best mode|difference between modes|how do modes work|explain modes|tell me about modes|what does chair mode do|what does recliner mode do|what does table mode do|what does table top mode do|chair mode|recliner mode|table mode|chair recliner table|play sitting|play lying down|do i need an open space|can i play in a small room|can i play in a small space|can i play in a tiny room|can i play in a tiny space|can i play in a small area|do i need to walk around|do i need to move around|do i have to walk|do i have to move|is it seated|is it a standing game|is it a sitting game|is it a sit down game|is it a stand up game|is it room scale|is it standing vr", [
  "There are three modes: Chair for sitting up, Recliner for lying back, and Table for a tiny tabletop view. All are seated!",
  "Chair, Recliner or Table! Open the menu, tap More, then Mode. You never need to stand or walk.",
  "Pick your comfort: Chair, Recliner or Table. Menu, More, Mode. No standing needed!"]);
I("mode-chair", "mode-chair", "chair|i am sitting|im sitting|im sitting in a chair|i am in a chair|im in a chair|im sitting up|i am on a chair|im on a chair|im sitting down|i am at my desk|im at my desk|sitting|sitting up|sit up|seated|i am seated|im seated|mode chair|chiar mode|chair mdoe|chiar", [
  "Switching to Chair mode! Sit up and enjoy.",
  "Chair mode, coming right up!",
  "Done! Chair mode is on."]);
I("mode-recliner", "mode-recliner", "recliner|im lying down|im laying down|im lying in bed|im laying in bed|i am in bed|im in bed|i am on the couch|im on the couch|i am on the sofa|im on the sofa|i am in a recliner|im in a recliner|i am lying back|im lying back|i am leaning back|im leaning back|i am reclined|im reclined|lying down|laying down|lie down|lay down|reclined|recline|mode recliner|reclinr mode|recilner mode|reclner|reclyner", [
  "Recliner mode on! Lean back and relax.",
  "Switching to Recliner mode. Cozy time!",
  "Done! Recliner mode is on."]);
I("mode-table", "mode-table", "table|tabletop|tabletop mode|table top|miniature mode|mini mode|tiny mode|small mode|shrink the room|make the room small|make it small|make the room smaller|make it smaller|shrink it|shrink|tiny room|tiny view|miniature|mini|i want to see it small|table view|put it on the table|put the room on the table|put it on my table|put the room on my table|make it a tabletop|mode table|tabel mode|tabl mode|tabletp mode|tabel", [
  "Table mode on! The whole room is on your tabletop.",
  "Switching to Table mode. Tiny and cute!",
  "Done! Table mode is on."]);
I("recenter", "recenter", "recenter|re center|recenter please|recenter bolt|recenter the view|recenter my view|recenter the room|recenter it|recenter everything|please recenter|can you recenter|center the view|center my view|center the room|center it|center me|center everything|reset position|reset my location|reset the room|reset view|reset camera|fix my view|fix the view|fix my position|fix the position|fix my angle|fix the angle|fix the camera|i feel giant|everything is too big|everything is too small|everything is huge|everything is tiny|everything is giant|everything is far away|everything is too close|everything looks tiny|everything looks huge|everything looks giant|everything looks far away|everything looks too close|re centre|recentre|recnter|recentr|recenetr|reecnter|resent|recentre view", [
  "Recentering your view now!",
  "Sure, resetting the view so everything's right in front of you.",
  "Done! Everything should be back in place."], { pr: 1.1 });
I("read-on", "read-on", "read aloud|read out loud|read to me|read the text|read the words|read the clues|read the hints|read everything|read all of it|turn on reading|turn on read|turn on voice|turn on narration|turn on narrator|turn on speech|im small|i am a kid|im a kid|i am a child|im a child|i am five|im five|i am six|im six|i am seven|im seven|i am eight|im eight|i am nine|im nine|i am ten|im ten|reed alowd|red aloud|read alowd|read alound|raed aloud", [
  "Read aloud is on! I'll speak the text for you.",
  "Sure! I'll read things out loud from now on.",
  "Reading aloud, coming up. You can turn it off any time."]);
I("read-off", "read-off", "stop reading|stop the narrator|stop narrating|stop narration|stop the voice|stop the speech|turn off reading|turn off read|turn off voice|turn off narration|turn off narrator|turn off speech|read off|reading off|narration off|i can read on my own|i read myself|i will read on my own|let me read|i want to read|stop red aloud|stop raed aloud|turn of read aloud|turn of reading|stp reading", [
  "Okay, no more reading aloud. The text will stay quiet.",
  "Got it! Read aloud is off.",
  "Reading is off. You can turn it back on any time."]);
I("music-on", "music-on", "turn on music|music on|music please|play music|play a song|play something|play songs|play tunes|put on music|put on a song|put on some tunes|start music|start the tunes|start the song|i want music|i want to hear a song|i want tunes|how do i get music|how do i hear music|more music|music|musik|msuic|muisc|musci|turn on the musik|turn on the msuic|turn on the muisc|turn on the musci|ply music|paly music", [
  "Music on! Let's get groovy.",
  "Tunes coming right up!",
  "Cranking up the music. Beep boop!"]);
I("music-off", "music-off", "turn off music|music off|stop music|stop the song|stop the tunes|stop the songs|stop the soundtrack|no music|no songs|no tunes|mute music|mute the soundtrack|mute the song|mute the tunes|silence music|silence the soundtrack|silence the song|silence the tunes|how do i pause music|how do i kill music|how do i cut music|msuic off|muisc off|musci off|musik off|turn off the musik|turn off the msuic|turn off the muisc|turn off the musci|stop the musik|stop the msuic|stop the muisc|stop the musci", [
  "Music off. Nice and quiet!",
  "Okay, silencing the tunes.",
  "Music is off. Say 'music on' if you change your mind."]);

// ================= INTENTS: game info =================
I("lobby", "lobby", "lobby|the lobby|lobby please|exit|exit room|leave room|i want to leave|i want to go back|let me out|main menu|go to the menu|go home|take me home|take me back|quit|quit game|i quit this room|change room|change rooms|different room|another room|new room|next room|switch rooms|switch room|loby|lobbby", [
  "Heading back to the Lobby!",
  "Okay, off to the Lobby. See you there!",
  "Sure thing, taking you back to the Lobby."], { pr: 1.05 });
I("repeat", "repeat", "repeat|repeat that|repeat please|say again|again|again please|once more|one more time|come again|pardon|pardon me|sorry what|what did you say|what was that|huh|what|eh|hm what|i did not hear|i didnt hear|i didnt hear that|i did not catch that|i didnt catch that|i missed that|i missed what you said|say that one more time|huh bolt|wat did you say|wut did you say|wat was that|wut was that|say it agian|repeet|repaet", [
  "Sure, once more!",
  "Of course, here it is again.",
  "No problem, listen closely!"], { pr: 1.05 });
I("slower-faster", null, "talk slower|speak slower|slow down|slower|slower please|too fast|talk faster|speak faster|faster please|speed up|you talk too slow|too slow talking|talk louder|speak louder|louder|louder please|louder bolt|speak up|i cant hear you|i can not hear|i cant hear|i can barely hear you|too quiet|too quiet bolt|you are too soft|volume up|turn up the volume|turn it up|turn it down|turn down the volume|volume down|lower the volume|raise the volume|so loud bolt|sound is too loud|no sound|i hear nothing|i do not hear anything|i dont hear anything|sound not working|audio not working|no audio|i cant hear anything|volum|vloume|lauder|louduh", [
  "Use your headset's volume buttons to change how loud I am. I'll keep my sentences short!",
  "Try the volume control on your headset or device. I'll do my best to be clear!",
  "If you can't hear me, check your headset volume. The subtitles show what I say, too!"]);
I("how-many-rooms", null, "how many rooms|how many levels|how many puzzles|how many games are there|how many worlds|how many doors|how many buildings|how many missions|how many stages|how many places|how many areas|how big is the game|how big is this game|is there more than one room|is there more than one level|are there other rooms|are there other levels|are there more rooms|are there more levels|what other rooms are there|what other levels are there|what are the other rooms|what are the other levels|which levels are unlocked|are all rooms open|are all levels open|are all rooms unlocked|are all levels unlocked|are the rooms locked|are the levels locked|do i unlock rooms|do i unlock levels|how do i get new rooms|how do i get new levels|how do i get more rooms|how do i get more levels|how many roms|how many romos|how many rooomz", [
  "There are seven rooms: Toy Workshop, Star Observatory, Sunken Lab, Clockwork Library, Grand Illusion, Zero Hour Vault, and the Mind Gallery!",
  "Seven rooms in all, from easy to expert, plus the Lobby. Pick any door!",
  "Lots to explore: Toy Workshop, Observatory, Sunken Lab, Library, Grand Illusion, Vault, and the Mind Gallery."]);
I("what-is-place", "", "what is this place|whats this place|where am i|where is this|what is this room|what room is this|what room am i in|which room is this|which room am i in|what is this area|what is this building|what is this location|what is this world|what is this game|what is this game called|what game is this|what is the name of this game|tell me about this room|tell me about this place|tell me about this area|tell me about this world|tell me about this game|tell me about this building|tell me about this location|tell me where we are|where are we right now|where are we bolt|what is the story|whats the story|whats the story of this room|what is the backstory|whats the backstory|what is the plot|whats the plot|what is this about|whats this about|whats this room about|what is this game about|whats this game about|whats this place about|wher am i|whre am i|wat is this place|wut is this place|wat room is this", ["roomabout", "roomabout"], { dyn: "roomabout", pr: 1.1 });
I("what-is-game", null, "whats an escape room|what is escape room|what is the point|whats the point|whats the point of this game|what is the goal of the game|whats the goal of the game|what is the aim|whats the aim|whats the aim of the game|what do i do in this game|what do you do in this game|what do i do in an escape room|what do you do in an escape room|how do i win this game|how do you win this game|how do i win an escape room|how do i beat this game|how do you beat this game|how do i beat an escape room|how do escape rooms work|how does escape room work|how do you escape|how do i escape a room|how to escape|how to win|how to beat the game|are we really locked in|am i really trapped|are we really trapped|am i really stuck here|are we really stuck here|is this real|is this a game|is this a simulation|is this a dream|is this a movie|is this a show|is this a test|is this a trick|is this a trap|is this a prank|is this a joke|is this really happening|is this actually happening", [
  "SeatBreak is a seated escape room game! Find clues, solve puzzles, and open the exit door. I'm here to help!",
  "You're locked in a puzzle room, but it's just a friendly game. Solve everything to escape!",
  "Goal: look around, find clues, solve puzzles, and escape. No scary stuff, just fun."]);
I("stars", null, "what do stars do|what are stars|what is the star for|what is a star|what are those stars|what are these stars|why stars|what do i do with stars|what can i do with stars|what can stars do|how do i get stars|how do i earn stars|how do i win stars|how do i collect stars|how can i get stars|how can i earn stars|how can i win stars|how can i collect stars|what is the top score|what is the max score|what is the maximum score|how do i get a perfect score|how do i get a high score|how do i get the best score|how do i get the highest score|how do i get the top score|how do i get the max score|how do i get the maximum score|what is par|what does par mean|stras|sars|three starz|3 starz", [
  "Stars are your reward! Escape fast with no hints to earn 3 stars. Stars unlock skins in the Skin Shop in the Lobby.",
  "Fast escapes with no hints earn 3 stars. Collect stars to unlock cool skins in the Lobby's Skin Shop!",
  "Earn stars by escaping quickly without hints, then spend them on skins at the Skin Shop in the Lobby."]);
I("skins", null, "how do i get skins|how do i unlock skins|how do i buy skins|how do i earn skins|how do i win skins|how do i get a skin|how do i unlock a skin|how do i buy a skin|how do i earn a skin|how do i win a skin|how do i change my look|how do i change my avatar|how do i change my outfit|how do i change my costume|how do i change my character|how do i change my robot|how do i change my appearance|how do i look different|how do i dress up|how do i customize|what are skins|what is a skin|what do skins do|what does a skin do|what skins are there|what skins can i get|what skins can i unlock|what skins can i buy|what skins do you have|what skins does the game have|what skins are in the game|skin shop|skins shop|shop|the shop|store|the store|skin|skins|scins|skinz|skin shpo", [
  "Skins are cool looks you unlock with stars! Visit the Skin Shop in the Lobby.",
  "Earn stars with fast no-hint escapes, then pick skins at the Skin Shop in the Lobby!",
  "The Skin Shop is in the Lobby. Stars unlock the skins!"]);
I("timer-par", null, "is there a timer|is there a clock|is there a countdown|is it timed|is this timed|are the rooms timed|are these timed|how much time do i have|how long do i have|how long have i got|whats the time limit|whats the timer|whats the countdown|what happens when time runs out|what happens if i run out of time|what happens when the clock runs out|what happens if the clock runs out|what happens if i take too long|what happens if i am slow|am i in a rush|am i in a hurry|are we in a rush|are we in a hurry|are we on a timer|am i on a timer|are we on the clock|am i on the clock|how fast do i need to be|how fast should i be|how fast do i have to be|how quick do i need to be|how quick should i be|how quick do i have to be|how do i go faster|how do i be faster|how do i get faster|how do i speed up|how can i go faster|how can i be faster|how can i get faster|how can i speed up", [
  "Some rooms have timers, and the Flood room has an air timer, but a tank drain is totally safe. Faster escapes earn more stars!",
  "Most rooms are relaxed. Zero Hour Vault and the Sunken Lab have clocks. Nobody gets hurt if time runs out, you just try again!",
  "No stress! If a timer runs out, you simply try again. Speedy, no-hint escapes get 3 stars."]);
I("how-long-game", null, "how long does it take|how long does this take|how long does a room take|how long does one room take|how long does each room take|how long is a room|how long is one room|how long is each room|how long is this room|how long is the game|how long is this game|how long is it|how long to finish|how long to beat|how long to play|how long to escape|how long to win|how long to solve|how long should it take|how long should a room take|how long should this take|how long is a game|how long is a round|how long is a level|how long is a session|how long can i play|how long should i play|how long is too long|how long is safe|should i take breaks|do i need breaks|is it ok to play for hours|is it okay to play for hours|can i play for hours|is it safe to play for hours|is it good to play for hours|is it bad to play for hours|is it ok to play a long time|is it okay to play a long time|can i play a long time|is it safe to play a long time|is it good to play a long time|is it bad to play a long time", [
  "Most rooms take about 5 to 10 minutes. Take a break every so often, and rest your eyes!",
  "Each room is short, usually 5 to 10 minutes. Remember to take breaks and drink some water.",
  "Quick rooms! A few minutes each. If you play a lot, rest your eyes every now and then."]);
I("save-progress", null, "does it save|does the game save|does this game save|is my progress saved|is my game saved|are my stars saved|are my skins saved|will it save my progress|will it save my stars|will it save my skins|will my progress be saved|will my stars be saved|will my skins be saved|will i lose my progress|will i lose my stars|will i lose my skins|do i lose my progress|do i lose my stars|do i lose my skins|can i save|how do i save|how do i load my progress|how do i continue my game|how do i continue my progress|how do i continue where i left off|how do i pick up where i left off|how do i resume|can i continue later|can i come back later|can i pick up later|can i pick up where i left off|can i resume later|can i resume where i left off|can i stop and come back", [
  "The game remembers your stars and skins on this device, so you can come back any time!",
  "Your progress is kept in your browser on this device. Stars and skins will be waiting for you.",
  "Yes, your stars and skins are saved here. Come back and keep playing!"]);
I("restart", null, "restart|restart the room|restart this room|restart the game|restart this game|restart the puzzle|restart this puzzle|restart level|start over|start again|start from the beginning|start from scratch|start fresh|begin again|reset|reset the room|reset this room|reset the game|reset this game|reset the puzzle|reset this puzzle|reset level|try again|can i restart|can i reset|can i redo|go again|do it again|do it again please|let me do it again|let me do that again|let us do it again|lets do it again|let us play again|lets play again|lets try again|let us restart|lets restart|let us start over|lets start over|let us start again|lets start again|rstart|restrat|resett|retyr", [
  "Want a fresh start? Open the menu, tap More, then Lobby, and pick the room again!",
  "To start over, head to the Lobby from the menu and walk back in. Easy!",
  "You can replay any room from the Lobby. Try for a faster time!"]);
I("bug-glitch", null, "there is a bug|there is a glitch|there is a problem|there is something wrong|there is an error|it is glitchy|its glitchy|it is buggy|its buggy|it is broken|its broken|it is not working|its not working|it does not work|it doesnt work|it is not loading|its not loading|it will not load|it wont load|it is frozen|its frozen|it froze|it crashed|it keeps crashing|it keeps freezing|it keeps glitching|it keeps lagging|it is lagging|its lagging|it is laggy|its laggy|it is slow|its slow|lag|laggy|glitch|glitchy|bug|my controller doesnt work|my controllers do not work|my controllers dont work|controllers not working|hands not working|my hands do not work|my hands dont work|hand tracking not working|my hand tracking does not work|my hand tracking doesnt work|buggg|glich|glitchh|laggg|frozn|froze up", [
  "Oh no, sorry about that! Try opening the menu, then More, then Recenter. If it's still stuck, go to the Lobby and re-enter the room.",
  "Glitches happen! Look down for the menu and try Recenter. If that fails, head to the Lobby and try again.",
  "I'm sorry the game acted up. Try Recenter, or leave and re-enter the room from the Lobby."]);
I("who-plays", null, "who can play|who is this game for|who is this for|who is it for|is this for kids|is this for adults|is this for teens|is this for everyone|is this for all ages|is this for grown ups|is this a kids game|is this an adult game|is this a teen game|is this a family game|is this family friendly|is this kid friendly|is this safe for kids|is this ok for kids|is this good for families|what age is this for|what ages is this for|what age is this room for|what ages is this room for|what is the age rating|what is the age limit|what room should i play|what room should i start with|what room should i try|what room should i pick|what room should i choose|where should i start|where should i begin|where do i start playing|where do i begin playing|easiest room|hardest room|best room|favorite room|beginner room|first room", [
  "Everyone! The Toy Workshop is easiest (ages 5+), then Observatory, Sunken Lab, Library, Grand Illusion, and the Vault for experts.",
  "There's a room for every age. Start with the Toy Workshop if you're new, or jump to a harder one if you're a pro!",
  "Kids start in the Toy Workshop. Teens and adults love the Observatory, Lab, Library, Illusion and Vault."]);
I("headset-types", null, "what headset do i need|what headset do i use|what headset is this for|what headsets work|does this work on quest|does this work on oculus|does this work on pico|does this work on vive|does this work on index|does this work on psvr|does this work on vision pro|does this work on a phone|does this work on my phone|does this work on a tablet|does this work on a computer|does this work on my computer|does this work on a laptop|does this work on my laptop|does this work on a pc|does this work on my pc|does this work on a mac|does this work on my mac|does this work without a headset|does this work with no headset|can i play without a headset|can i play with no headset|can i play on my phone|can i play on my tablet|can i play on my computer|can i play on my laptop|can i play on my pc|can i play on my mac|can i play on quest|does it have in app purchases|does this have in app purchases|are there microtransactions|does it have microtransactions|does this have microtransactions|do i need to log in|do i need to sign in|do i need an account|do i need to register|do i need to sign up|do i need a password|do i need an email|do i need to give my email|do i need to give my name|do i need to give my age|do i need to give any information|do i need to give any info|do i need to give personal information|do i need to give personal info", [
  "It's made for VR headsets like Meta Quest, and it runs right in the browser. No downloads or accounts needed!",
  "It's a web game for VR headsets, free to try, with no sign-in needed.",
  "It runs in your browser, with VR headsets in mind. Easy and no sign-up!"]);
I("multiplayer", null, "can i play with friends|can i play with a friend|can i play with my friend|can i play with others|can i play with other people|can i play with my family|can i play with my brother|can i play with my sister|can i play with my mom|can i play with my dad|can i play online|can i play with strangers|can i play with someone|can i play with somebody|can i play together|can we play together|can two people play|can two players play|can 2 people play|can 2 players play|can more than one person play|can more than one player play|can multiple people play|can multiple players play|is there multiplayer|is it multiplayer|is this multiplayer|is there co op|is it co op|is this co op|is there coop|is it coop|is this coop|is there a two player mode|is there a 2 player mode|is anybody else here|is anybody else playing|is someone else here|is someone else playing|is somebody else here|is somebody else playing|can my friends see me|can others see me|can people see me|can people hear me|can others hear me|can strangers see me|can strangers hear me|can strangers talk to me|can strangers message me|can strangers contact me|can strangers find me|can strangers join", [
  "It's a solo adventure right now, so just you and me! Friends can take turns trying the rooms.",
  "One player at a time. You and I are the whole team! Pass the headset to a friend after.",
  "No other players here, just you and Bolt. Nobody can see or talk to you."]);
I("new-rooms", null, "will there be more rooms|will there be new rooms|will there be more levels|will there be new levels|will there be more puzzles|will there be new puzzles|will there be more games|will there be new games|will there be updates|will there be an update|is there an update|is there a new update|is there a new version|is there a new room|is there a new level|is there a new puzzle|is there a new game|is there a sequel|will there be a sequel|are you making more|are you making new rooms|are you making new levels|are you making new puzzles|are you adding more|are you adding new rooms|are you adding new levels|are you adding new puzzles|when are new rooms coming|when are new levels coming|when are new puzzles coming|when is the next room|when is the next level|the illusion room|illusion gallery|the illusion gallery|optical illusion room|the optical illusion room|optical illusion gallery|the optical illusion gallery|optical illusions|what are optical illusions|whats an optical illusion|what is an optical illusion|what is an illusion|whats an illusion|illusions|illusion|i like illusions|i love illusions|show me an illusion|show me illusions|show me optical illusions|do you know any illusions", [
  "Yes! New things are being built, like the Mind Gallery full of optical illusions. Stay tuned!",
  "More rooms are on the way, so keep an eye on the Lobby for new doors!",
  "The game keeps growing! The Mind Gallery is a room of illusions that play tricks on your eyes."]);


// ================= INTENTS: rooms (room-aware) =================
// opt.rooms: rooms where the thing exists (boosts matching there, dampens it elsewhere)
// opt.room: per-room replies; opt.away: reply when the player is in a room without the thing; opt.go: per-room redirect to another intent
const RM = (id, pats, replies) => I("room-" + id, null, pats, replies, { pr: 1.12 });
RM("hub", "what is the lobby|what is the hub|what is the village|what is the floating village|tell me about the lobby|why is the lobby floating|what are the doors in the lobby|what are the buildings|which door do i pick|which room should i pick|which room should i try|which room first|how do i pick a door|how do i pick a room|how do i enter a door|how do i enter a room|how do i go into a building|how do i start a room|the lobby buildings|how do i get in|how do i go in|how do i get inside|how do i enter", [
  "The Lobby is a floating village! Every glowing building is a different escape room. Look at one for a second to step in.",
  "Doors everywhere! New here? The Toy Workshop is easiest. Puzzle pro? Try the Zero Hour Vault.",
  "Each building's sign shows its level and your stars. Look at one to enter!"]);
RM("kids", "what is the toy workshop|tell me about the toy workshop|toy workshop|the toy workshop|toy room|the toy room|the pink cottage|pink cottage|the kids room|kids room|the easy room|easy room|toy workshop hint|toy workshop help|toy wokshop|toy workshpo|toy worksop", [
  "The Toy Workshop is the easy room, for ages 5 and up! Find three hidden shapes for the Toy Door, then answer its counting question.",
  "Toy Workshop: shapes, counting and some very sneaky toys. Look at things to poke them!"]);
RM("teens", "what is the star observatory|tell me about the star observatory|star observatory|the star observatory|the observatory|observatory|the dome|the blue dome|the space room|space room|the astronomy room|astronomy room|the planet room|planet room|observatory hint|observatory help|observatry|obsevatory|starr observatory|prof vega|professor vega|who is prof vega|who is professor vega", [
  "The Star Observatory is a medium space room, ages 9 and up. Prof. Vega's power tripped, and the exit needs a code from the planets!",
  "Observatory: fix the power, then use the chart, telescope and planet model to crack the exit keypad."]);
RM("flood", "what is the sunken lab|tell me about the sunken lab|sunken lab|the sunken lab|the lab|the water room|water room|the flood room|flood room|the flooding room|the tank room|the test tank|what is the test tank|is the water real|why is the water rising|the rising water|rising water|water is rising|the water is rising|the water is coming up|the tank is filling|the tank is filling up|sunkin lab|sunken lba|sunkn lab", [
  "The Sunken Lab is a medium room, ages 10 and up. The water is pretend, so nobody gets wet! Use science to ride a raft up to the hatch.",
  "Sunken Lab: float the capsule, fix the pump, measure water, then crack the hatch code before the timer ends."]);
RM("adults", "what is the clockwork library|tell me about the clockwork library|clockwork library|the clockwork library|the library|library|the book room|book room|the clock room|clock room|the old library|the founder|who is the founder|the librarian|who is the librarian|the library after closing|library after closing time|the hard room|clockwork libary|clockwork librarry|clockwork libray", [
  "The Clockwork Library is a hard room, ages 13 and up. You're locked in after closing time, and every clue unlocks the next!",
  "Library: a logic chain of clocks, keys, books and a sneaky portrait. Read everything closely!"]);
RM("theater", "what is the grand illusion|tell me about the grand illusion|grand illusion|the grand illusion|the theater|theater|theatre|the theatre|the stage room|the magic room|magic room|the magic show|the great escape|grand ilusion|grand illusoin|grand illusin", [
  "The Grand Illusion is a hard room, ages 12 and up. You're on stage with three padlocks: balance, sound and light!",
  "Theater: you're pretend-chained to a chair. Three science locks set you free. Showtime!"]);
RM("expert", "what is the zero hour vault|tell me about the zero hour vault|zero hour vault|the zero hour vault|the zero hour|zero hour|the spy room|spy room|the spy mission|spy mission|the expert room|expert room|the bunker|the red bunker|the secret agent room|secret agent|agent|spy|zero hour vualt|zero hour vault help|zero our vault|zero hor vault", [
  "The Zero Hour Vault is the expert room: a 15 minute spy mission with lasers, Morse code and a vault. Agents only!",
  "Vault: beat the laser grid, decode the beacon, open the vault. Wrong codes cost 30 seconds, agent!"]);
RM("mind", "what is the mind bender|tell me about the mind bender|mind bender|the mind bender|the mind gallery|mind gallery|what is the mind gallery|the gallery|gallery|the mind room|the illusion room|illusion room|the illusion gallery|illusion gallery|optical illusion room|the optical illusion room|the optical illusion gallery|what are the illusions|why do illusions work|how do optical illusions work|how do illusions work|are illusions real|why do my eyes play tricks|my eyes are tricked|my eyes are playing tricks|my brain is tricked|is it a trick|is this a trick|why are my eyes tricked|why is my brain tricked|optical illusions|what are optical illusions|what is an optical illusion|what is an illusion|illusions|illusion|i like illusions|i love illusions|show me an illusion|show me illusions|mind galery|mind gallry|mnd gallery|mind bendr|mind bener", [
  "The Mind Bender is a medium room of optical illusions, ages 8 and up. Each exhibit hides one digit of the exit code!",
  "Illusions happen because your brain makes quick guesses. In the Mind Bender, trust measuring over looking!"]);

I("room-goal", null, "what do i do here|what do i do in here|what do i do in this room|what am i supposed to do here|what am i supposed to do in this room|what is the goal here|what is the goal of this room|what is the point of this room|how do i escape this room|how do i beat this room|how do i win this room|how do i finish this room|how do i win|what is the mission|what is my mission|what is the plan|what do we do here|what should i do here|what is this room for|how does this room work|explain this room|explain this puzzle|what is the puzzle here|what are the puzzles here|what do i need to do here|what do i have to do here|what is my job here|what do i do in this game|wat do i do here|wut do i do here|what do i doo here|whta do i do here", ["Let's see what this room needs!", "Here's the mission!"], { dyn: "roomgoal", pr: 1.12 });
I("room-things", null, "what is this|what is that|what is that thing|what is this thing|what are these|what are those|what are these things|what are those things|what are all these things|what is all this|what is all this stuff|what is this stuff|what is that stuff|what can i touch|what can i click|what can i use|what can i look at|what can i play with|what can i interact with|what is in this room|what is in here|what objects are here|what things are here|what is here|what is around me|what do i see|what am i looking at|what is that over there|what is this object|what is that object|what does this do|what does that do|what is that for|what is this for|wat is this|wut is this|whats dis|what is dis|wat is that", ["Ooh, let me look around!", "Here's what I spot!"], { dyn: "roomthings", pr: 1.1 });

// ---- light switch + glow-in-the-dark secrets (every room except the Lobby) ----
const SWITCH = { hub: ["The Lobby has no light switch, but every room does! Turn its lights off to find a glowing secret.", "No switch out here! Each room has one on a wall. Flip it to hunt for that room's secret."],
  teens: ["There's a light switch on the wall! The main power is a different problem, though. That needs the breaker box.", "Flip the wall switch to make it dark and hunt for the glowing secret. For main power, check the breaker box!"] };
const SW_DEF = ["Every room has a light switch on a wall. Look at it to flip the lights off, and look around for something that glows!",
  "Lights off, secrets on! Find the switch on a wall, flip it, then look up high for glowing words.",
  "Look for the light switch on a wall. In the dark, a secret message glows. Flip it back on whenever you like!"];
I("light-switch", null, "light switch|the light switch|a light switch|lights off|light off|turn off the lights|turn the lights off|turn off the light|turn the light off|lights on|light on|turn on the lights|turn the lights on|turn on the light|turn the light on|switch off the lights|switch on the lights|how do i turn off the lights|how do i turn on the lights|how do i turn the lights off|how do i turn the lights on|where is the light switch|where is the switch|is there a light switch|it is too bright|make it dark|make it darker|make it brighter|can i turn off the lights|can i turn the lights off|the switch|switch|wall switch|the wall switch|lightswitch|lite switch|light swich|ligth switch|lihgt switch|turn of the lights|turn of the light", SW_DEF, { room: SWITCH, pr: 1.16 });
I("light", null, "light|lights|the light|the lights|a light|what about the lights|what about the light|what do the lights do|what are the lights for|lighting|ligt|ligth|lite|lites", SW_DEF, { room: SWITCH, go: { theater: "obj-lamps" }, pr: 1.1 });
const SECRETS = { hub: ["Every room hides one glow-in-the-dark secret. Turn a room's lights off to find it! The Skin Shop sign counts how many you've found.", "Seven rooms, seven glowing secrets! Flip a room's light switch off and look up high."],
  kids: ["Shapes that glow and spin can be picked up! The real secret only glows with the lights off. Find the switch!", "This workshop has a glowing secret! Flip the light switch off, then look up high."] };
I("secret-glow", null, "secret|secrets|the secret|a secret|what is the secret|what is the secret here|what is the secret of this room|where is the secret|where is the secret here|where are the secrets|is there a secret|is there a secret here|is there a secret in this room|are there secrets|are there any secrets|are there secrets here|any secrets|hidden secret|the hidden secret|glow in the dark|glow in the dark secret|glowing secret|the glowing secret|glowing words|the glowing words|glowing writing|the glowing writing|glowing message|the glowing message|what is glowing|what is that glowing|why is it glowing|glow paint|glow|glowing|it glows|secret message|the secret message|hidden message|the hidden message|how do i find the secret|how do i find secrets|how do i find the secrets|how many secrets are there|what are secrets|what are the secrets|secrets count|secrets 3 7|secret counter|how many secrets|secret count|secrets found|what are secrets for|what do secrets do|secert|secrit|sercet|seceret|secrets please", [
  "This room hides a glow-in-the-dark secret! Flip the light switch on the wall off, then look up high.",
  "Secrets glow only in the dark. Find the light switch, turn it off and look around the walls!",
  "Psst! Turn off this room's lights and a hidden message glows. Each one teaches a cool science fact!"], { room: SECRETS, pr: 1.12 });
I("found-secret", null, "i found a secret|i found the secret|i found it glowing|found the secret|found a secret|i see glowing words|i see the secret|i see a glowing message|i found the glowing message|i found the glow in the dark secret|the secret is glowing|i found the hidden message", [
  "You found the secret! Great detective work. The Skin Shop sign keeps count of every one.",
  "Whoa, sharp eyes! That's one more secret for your collection.",
  "Secret spotted! Each glowing message is a real science fact. How cool is that?"]);

// ---- shared words whose meaning depends on the room ----
I("thing-code", null, "code|the code|codes|a code|what is the code|what is the code here|what is the exit code|exit code|the exit code|door code|the door code|secret code|the secret code|what is the secret code|password|the password|what is the password|combination|the combination|what is the combination|combo|number code|the number code|what numbers do i need|which numbers|what numbers|enter the code|where do i enter the code|where do i type the code|how do i enter the code|keypad|the keypad|exit keypad|the exit keypad|key pad|the numbers|what is the pin|pin code|how many digits|how many numbers|how many numbers do i need|cod|coed|kode|teh code", [
  "Codes hide in clues! Look around the room, and say 'answer' if you ever want me to just tell you."], { room: {
  hub: ["No codes in the Lobby! Pick a room and you'll find plenty.", "The Lobby has no locks at all. Codes live inside the rooms!"],
  kids: ["No number code here! The Toy Door asks a counting question, and you answer with the number blocks.", "The Toy Door doesn't use a code. Fit three shapes, then answer its question with a number block!"],
  teens: ["The exit keypad wants four numbers. The lit chart, the telescope and the solar system model each give a piece!", "Four numbers open the exit. Each one is a planet's place from the Sun. Which planets? The chart knows!"],
  mind: ["The exit code is five digits, A B C D E. Each exhibit gives one, and the floating tiles give the last!", "Solve an exhibit and its code digit appears. Five digits in all, in order A to E!"],
  flood: ["The ceiling hatch needs a 3-digit code. The dive chart and the HATCH CODE sign are your clues!", "The hatch code is all about water pressure. Read the dive chart, then do the math!"],
  adults: ["The safe takes a four-number combination. A hidden clue tells you where the numbers are!", "Numbers hide on some book spines, but which books count? Follow the clue chain to find out!"],
  theater: ["No number code here! The three padlocks open with balance, sound and light.", "The Grand Illusion has no keypad. Each padlock opens when you solve its science puzzle!"],
  expert: ["Two codes, agent: a 4-letter codeword at the terminal, then 4 numbers on the vault. Wrong tries cost 30 seconds!", "The beacon spells the codeword, and the camera monitors hold the vault numbers. Order matters!"] }, pr: 1.12 });
I("thing-key", null, "key|keys|the key|a key|the keys|where is the key|where is a key|where are the keys|find the key|i need a key|i need the key|what does the key do|what is the key for|what key|which key|how do i use the key|i have a key|i found a key|keyhole|the keyhole|a keyhole|kee|kye|keey|teh key", [
  "Keys open locks, but not every room uses them! Ask me about the code or the exit instead."], { room: {
  hub: ["No keys needed in the Lobby! Just look at a building to go inside.", "The Lobby is wide open. Keys and locks are inside the rooms!"],
  kids: ["No keys in the Toy Workshop! The Toy Door opens with shapes and a counting question.", "This door doesn't need a key. It needs three shapes and a good counter!"],
  teens: ["No key here! The exit uses a keypad, and the breaker box needs a fuse.", "Prof. Vega didn't leave a key. She left a note, a drawer and a keypad!"],
  mind: ["No keys in the Mind Bender, just a five-digit exit code.", "The exit door wants a code, not a key. The exhibits hold the digits!"],
  flood: ["No keys in the lab! The hatch has a code lock, and the raft has clamps.", "Keys would get soggy down here! The hatch uses a 3-digit code instead."],
  adults: ["The library has two keys: a small brass key and a fancy ornate key. Each one opens something different!", "Two keys, two locks. A plain key fits a plain keyhole, and a fancy key fits a fancy one!"],
  theater: ["No keys! Each padlock opens when you solve its puzzle: balance, sound or light.", "These padlocks are magic-show locks. Science opens them, not keys!"],
  expert: ["No keys, agent. The vault uses a keypad and the terminal uses a codeword.", "Spies don't need keys here! Codes and lasers are your tools."] }, pr: 1.12 });
I("thing-exit", null, "the exit|where is the exit|exit door|the exit door|where is the door|the door|door|doors|how do i open the door|how do i open the exit|the way out|where is the way out|how do i find the exit|how do i find the way out|where do i get out|which way is out|is there a door|exti|exitt|dor|the dor", [
  "Every room has its own way out. Solve its puzzles and the exit opens!"], { room: {
  hub: ["Every building here is a door to a room! To leave a room later, open the menu and pick Lobby.", "Look at any building to step through its door. Each one is a different adventure!"],
  kids: ["The big Toy Door is the way out! It needs three shapes, then it asks you a counting question.", "See the Toy Door? Three shape holes, then a question. That's your exit!"],
  teens: ["The exit door has a keypad. Get the power on first, then work out the four numbers!", "The exit slides open with the right four numbers. Power first, then planets!"],
  mind: ["The exit door wants a five-digit code, A B C D E. One digit from each exhibit!", "The gallery door opens with five digits. Solve the exhibits to collect them!"],
  flood: ["The way out is the hatch in the ceiling! Ride your raft up, then enter the hatch code.", "Look up! The hatch is your exit. The rising water helps you reach it."],
  adults: ["The great library doors are on the south wall. Their keyhole is fancy, so a plain key won't fit!", "The big doors behind you are the exit. You'll need the right key, and it's a fancy one!"],
  theater: ["First get free of the chair! Open all three padlocks and the show takes care of the rest.", "Your escape is the chair, not a door! Unlock balance, sound and light."],
  expert: ["Your target is the vault, agent. Open it to complete the mission!", "Mission exit: crack the vault. Grid first, then the beacon, then the keypad!"] }, pr: 1.08 });
I("thing-drawer", null, "drawer|the drawer|drawers|desk drawer|the desk drawer|the locked drawer|locked drawer|how do i open the drawer|what is in the drawer|the desk|desk|writing desk|the writing desk|drawr|drawor|drawwer", [
  "I don't see a drawer to open in this room. Ask me what's here!", "No drawers here! Try asking me 'what is this' for a tour."], { rooms: ["teens", "adults"], room: {
  teens: ["Prof. Vega's desk has a drawer. Read her note, then look at the drawer to slide it open!", "That desk drawer might hold something useful. Prof. Vega's note mentions it!"],
  adults: ["The writing desk drawer is locked with a small brass keyhole. A small key must fit it!", "Locked tight! The drawer needs a little brass key. Where might one be hiding?"] }, pr: 1.14 });
I("thing-note", null, "note|the note|a note|notes|read the note|the letter|letter|what does the note say|the paper|paper|the message|the sign|sign|signs|the signs|poster|the poster|posters|what does the sign say|read the sign|nte|noet|teh note", [
  "Signs and notes are clues! Read every one closely."], { room: {
  hub: ["The big sign says SeatBreak! Each building's sign shows its level and your stars.", "Building signs show each room's level, ages and your stars. Pick one!"],
  kids: ["Look at the Toy Door! A question sign pops up once all three shapes fit.", "The Toy Door is labeled, and it has a question waiting for you later!"],
  teens: ["Prof. Vega left a note on her desk. Read it! She's always writing reminders about the power.", "That note is from Prof. Vega. It talks about the power and where she keeps spares!"],
  mind: ["Each exhibit has a sign with a question. Exhibit E's sign explains the floating tiles!", "Read the exhibit signs. Each one asks a tricky eye question!"],
  flood: ["The FLOAT OR SINK poster, the dive chart and the HATCH CODE sign are all science clues!", "Read the posters! They explain floating, sinking and water pressure."],
  adults: ["The Librarian left a note on the writing desk. It mentions the clock and the founder. Read it closely!", "That note is clue number one in the chain. The brass plaque on the fireplace goes with it!"],
  theater: ["Each padlock has a sign with a science rule: balance, sound or light. Read them!", "The lock signs explain the science. Weights, notes and colors!"],
  expert: ["Read the labels: EMITTER, RECEIVER and SIGNAL BEACON. The Morse chart helps too!", "Every label in here is intel, agent. Read them all!"] }, pr: 1.1 });
I("thing-chart", null, "chart|the chart|charts|the rusty one|the windiest one|the one that would float|the one that floats|which planet is home|what planet is home|home planet|what planet floats|which planet floats|which planet is rusty|what is the rusty one|the four worlds|four worlds|tonight s four worlds|how many atmospheres|atmospheres at|pressure at|what is the pressure at|20 m|40 m|0 m|20 meters|40 meters|at 20 meters|at 40 meters|star chart|the star chart|the lit chart|the dive chart|dive chart|morse chart|the morse chart|the chart on the wall|what does the chart say|map|the map|atmospheres|what is an atmosphere|chrat|cahrt|chatr", [
  "No chart in this room, but every sign is worth a read!", "I don't see a chart here. Try asking me 'what is this' for a tour!"], { rooms: ["teens", "flood", "expert"], room: {
  teens: ["The star chart lights up once the power is back on. It lists tonight's four worlds, in order!", "The chart gives four planet clues. The telescope helps you figure out which planets they mean!"],
  flood: ["The dive chart explains water pressure in atmospheres. It's the key to the hatch code!", "Start at 1 atmosphere for the air, and add more as you go deeper. The dive chart shows how!"],
  expert: ["The Morse chart shows which dots and dashes make which letters. Perfect for the beacon!", "Dot means a short flash, dash means a long one. Match them on the Morse chart!"] }, pr: 1.14 });

// ---- Toy Workshop (kids) ----
const OB = (id, rooms, pats, replies, away, opt) => I("obj-" + id, null, pats, replies, Object.assign({ rooms, away, pr: 1.15 }, opt || {}));
OB("teddy", ["kids"], "teddy|teddy bear|the teddy|the teddy bear|the bear|the toy bear|the stuffed bear|the stuffed animal|the toy shelf|the shelf|toy shelf|what is the teddy hiding|why is the teddy looking funny|how do i use the teddy|where is the teddy|tedy|teddie|teddy bare|tedyy|tedd bear", [
  "Teddy sits on the toy shelf looking very innocent. Give him a poke and see what he's up to!",
  "That teddy bear might be guarding something. Look at him for a second!",
  "Teddy loves visitors! Say hi with a poke and watch closely."], ["The teddy bear lives in the Toy Workshop. Pop in and say hi!", "Teddy is in the Toy Workshop, guarding the toy shelf!"]);
OB("drum", ["kids"], "drum|the drum|drums|the drums|drumstick|drumsticks|the red drum|red drum|bang the drum|how do i use the drum|what does the drum do|where is the drum|toy drum|the toy drum|beat the drum|drm|drumm|druum", [
  "A big red drum! Look at it to give it a bang, and listen closely. Did something rattle?",
  "Boom! Drums are loud, and this one might be hiding a surprise. Keep listening!",
  "Bang the red drum and see what happens. Great drummers don't give up after one try!"], ["The red drum is in the Toy Workshop. Boom boom!", "That drum lives in the Toy Workshop. Go make some noise!"]);
OB("train", ["kids"], "train|the train|toy train|the toy train|the train set|train set|train track|the track|the toy track|choo choo|how do i use the train|what does the train do|where is the train|trian|trane|tran set", [
  "The toy train is parked on its track. Look at it to make it go, then watch closely!",
  "Choo choo! Start the train and keep your eyes on the track.",
  "All aboard! That train has been parked a while. What happens when it moves?"], ["The toy train is in the Toy Workshop. Choo choo!", "Trains run in the Toy Workshop. All aboard!"]);
OB("ducks", ["kids"], "duck|ducks|the duck|the ducks|rubber duck|rubber ducks|yellow duck|yellow ducks|the rubber duck|the rubber ducks|count the ducks|how many ducks|how many ducks are there|where are the ducks|where are the yellow ducks|how do i count the ducks|duck hint|duk|ducs|duckys|ducky|duckies|rubber duckies", [
  "Rubber ducks love hiding! The Toy Door will ask about them, so keep your eyes peeled.",
  "Quack! Ducks hide in sneaky spots. Look high, look low, look under things!",
  "Counting ducks? Turn all the way around and check every corner. Ducks are sneaky!"], ["The rubber ducks are hiding in the Toy Workshop!", "Quack! The ducks live in the Toy Workshop."]);
OB("blocks", ["kids"], "number blocks|the number blocks|how do i answer|how do i answer the question|how do i answer the door|blocks|the blocks|number block|block|the block|which block|which number|which number block|answer blocks|the answer blocks|the numbers on the blocks|the question|the door question|blcoks|bloks|blokcs", [
  "The number blocks are how you answer the Toy Door's question. Count carefully first!",
  "Pick a number block to answer the door's question. No rush, count twice!"], ["The number blocks are in the Toy Workshop!", "Number blocks? Those are in the Toy Workshop, by the Toy Door."]);
OB("toydoor", ["kids"], "toy door|the toy door|the big door|the pink door|the holes|the door holes|the shape holes|the holes in the door|matching holes|the matching holes|shape hole|shape holes|toy dor|toydoor", [
  "The Toy Door has three shape holes: a red star, a blue moon and a yellow triangle. Bring the shapes to match!",
  "Each hole on the Toy Door wants one shape. When all three fit, the door asks a question!"], ["The Toy Door is in the Toy Workshop!", "That's in the Toy Workshop, where three shapes are missing!"]);
OB("shapes", ["kids"], "shapes|the shapes|a shape|missing shapes|the missing shapes|red star|the red star|blue moon|the blue moon|yellow triangle|the yellow triangle|star shape|moon shape|triangle shape|triangle|the triangle|glowing shape|spinning shape|the glowing shape|where are the shapes|how do i find the shapes|where do the shapes go|where do i put the shapes|star|the star|where is the star|where is the moon|where is the triangle|where could the star be|glowing star|i see a glowing star|a glowing shape|i see a shape|i found a shape|i found the star|i found the moon|i found the triangle|i have a shape|i have all the shapes|what do i do with the shapes|how many sides does a triangle have|shaps|shapez|trinagle|triangel|trianlge", [
  "Three shapes are hiding around the workshop: a red star, a blue moon and a yellow triangle. Toys might be hiding them!",
  "When a shape glows and spins, look at it to pick it up. Then match it to its hole in the Toy Door!",
  "Shapes fit in matching holes. A triangle has 3 sides, and a star has 5 points!"], ["The red star, blue moon and yellow triangle are in the Toy Workshop!", "Shape puzzles live in the Toy Workshop. A triangle has 3 sides!"]);
OB("table", ["kids"], "the table|under the table|the play table|the little table|look under the table|the kids table|the drawing|the drawing on the table", [
  "That's the play table, with a little drawing on top. Look all around it!",
  "A cozy play table! Check on it, around it, and anywhere else a toy might hide."], ["That's not a puzzle here. Try asking me 'what is this' for a tour!", "Hmm, no special table in this room. Ask me 'what is this'!"]);
OB("rocket", ["kids"], "rocket|the rocket|toy rocket|the toy rocket|spaceship|the spaceship|blast off|rokcet|rocet|rockit", [
  "The toy rocket is just for fun. Look at it for a countdown and blast off!",
  "Three, two, one, blast off! The rocket is a fun extra, so play all you like."], ["The toy rocket is in the Toy Workshop. Blast off!", "Rockets launch in the Toy Workshop!"]);
OB("ball", ["kids"], "ball|the ball|bouncy ball|the bouncy ball|bounce the ball|bal|baal", [
  "Boing! The bouncy ball is just for fun. Give it a bounce!",
  "That bouncy ball is a toy break. Bounce away!"], ["The bouncy ball is in the Toy Workshop. Boing!", "Boing! Bouncy balls live in the Toy Workshop."]);

// ---- Star Observatory (teens) ----
OB("fuse", ["teens"], "fuse|fuses|the fuse|the fuses|spare fuse|the spare fuse|fuse box|the fuse box|breaker|breakers|the breaker|breaker box|the breaker box|circuit breaker|main power|the main power|the power|power|the power is out|there is no power|no power|how do i turn on the power|how do i get power|how do i fix the power|how do i fix the fuse|fuze|fues|breker|braker|powr", [
  "The breaker box on the west wall has an empty fuse slot. No fuse, no power! Prof. Vega's note may help.",
  "Power first! Find a spare fuse, then fit it in the breaker box.",
  "The observatory is dark because the power tripped. A fuse and the breaker box will fix it!"], ["The fuse and breaker box are in the Star Observatory. The power here is fine!", "Fuses are an Observatory thing. Prof. Vega's power keeps tripping!"]);
OB("telescope", ["teens"], "telescope|the telescope|how do i use the telescope|what does the telescope do|what is the telescope for|where is the telescope|how do i look through the telescope|telescope hint|telescope help|telscope|telescpoe|telesciope|teliscope|look through the telescope|stargazing|stargaze|aim the telescope", [
  "The telescope finds a planet each time you look at it, plus a fact about it. Try it more than once!",
  "Look at the telescope again and again. Each look shows a different world, and the facts matter!",
  "The telescope's motor needs power first. Then each look aims it at a new planet!"], ["The telescope is in the Star Observatory. Look up!", "Telescopes live in the Star Observatory, with Prof. Vega's planets!"]);
OB("model", ["teens"], "solar system model|the solar system model|model|the model|planet model|the planet model|planet models|the planet models|the model planets|model planets|the row of planets|orrery|modle|modell|solar system modle", [
  "The solar system model shows the planets in order from the Sun. Look at a planet to hear its name!",
  "Each model planet has a name plate. Count along the row from the Sun to find its number!"], ["The solar system model is in the Star Observatory!", "That model lives in the Star Observatory. Sizes not to scale!"]);
OB("planets", null, "planets|the planets|planet|a planet|what are the planets|what is the order of the planets|what order are the planets in|order of the planets|planet order|the planet order|how many planets are there|how many planets|name the planets|list the planets|which planet is first|which planet is closest to the sun|which planet is farthest from the sun|which planet is furthest from the sun|mercury|venus|earth|jupiter|uranus|is pluto a planet|solar system|the solar system|the sun|planits|plantes|planeets", [
  "The eight planets from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune!",
  "Planet order, outward from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune."], null);

// ---- Mind Bender (mind) ----
OB("exhibits", ["mind"], "exhibits|the exhibits|exhibit|an exhibit|they look the same|they are the same|it is the same|they are equal|both the same|exactly the same|they look different|the pictures|the illusions here|what are the exhibits|how do the exhibits work|exibit|exhibt|exhbit", [
  "Exhibits A to D each ask a question. Answer right and a code digit appears! Exhibit E gives the last one.",
  "Each exhibit is an illusion with a question. Trust measuring, not just looking!"], ["The exhibits are in the Mind Bender, the illusion gallery!", "Exhibits A to E are in the Mind Bender. Brain tricks ahead!"]);
OB("exhibit-a", ["mind"], "exhibit a|exhibit 1|exhibit one|the first exhibit|the lines|which line is longer|the arrows|the line illusion|the two lines|lines", [
  "Exhibit A asks which of two lines is longer. Look closely before you choose!",
  "Exhibit A is a line puzzle. Those arrow ends are sneaky, and that's the fun!"], ["Exhibit A is in the Mind Bender!", "That line puzzle is in the Mind Bender."]);
OB("exhibit-b", ["mind"], "exhibit b|exhibit 2|exhibit two|the second exhibit|the circles|which circle is bigger|the center circles|the middle circles|circle illusion|circles", [
  "Exhibit B asks which center circle is bigger. The circles around them might be playing tricks!",
  "Exhibit B: two middle circles, two crowds of neighbors. Do the neighbors change what you see?"], ["Exhibit B is in the Mind Bender!", "That circle puzzle is in the Mind Bender."]);
OB("exhibit-c", ["mind"], "exhibit c|exhibit 3|exhibit three|the third exhibit|the squares|which square is darker|the checkerboard|the shadow squares|the marked squares|square illusion|squares", [
  "Exhibit C asks which marked square is darker. Shadows and neighbors can trick your eyes!",
  "Exhibit C is a shading puzzle. Your brain loves to guess about shadows!"], ["Exhibit C is in the Mind Bender!", "That square puzzle is in the Mind Bender."]);
OB("exhibit-d", ["mind"], "exhibit d|exhibit 4|exhibit four|the fourth exhibit|the white panel|white panel|the stare|stare|staring|20 second stare|the 20 second stare|twenty second stare|the 20 second timer|the dot|stare at the dot|the ghost|ghost color|the ghost color|what color is the ghost|the green shape|white pannel|i see pink|i see green|i see blue|i see a ghost|i see a color|i see a ghost color", [
  "Exhibit D: look at it to start a 20 second stare. Keep your eyes on the dot, then look at the white panel!",
  "The white panel is where a ghost color appears after the 20 second stare. What color do you see?",
  "Stare without moving your eyes for the full 20 seconds. Then the white panel shows you a ghost!"], ["Exhibit D and the white panel are in the Mind Bender!", "The 20 second stare is in the Mind Bender."]);
OB("exhibit-e", ["mind"], "exhibit e|exhibit 5|exhibit five|the last exhibit|the floating tiles|floating tiles|the tiles|tiles|the scattered number|scattered number|the eye spot|eye spot|the eye|the yellow spot|the spot on the floor|the floating numbers|floating numbers|the mess|tyles", [
  "Exhibit E's floating tiles look like a mess. Glide to the yellow EYE spot on the floor and look again!",
  "From the EYE spot, the scattered tiles make the last code digit. In Table mode, just ask me for the answer!"], ["The floating tiles and the EYE spot are in the Mind Bender!", "Exhibit E is in the Mind Bender."]);

// ---- Sunken Lab (flood) ----
OB("capsule", ["flood"], "capsule|the capsule|the tube|glass tube|the glass tube|the sinking thing|the thing in the tube|float or sink|the float or sink poster|how do i make it float|how do i make the capsule float|why does the capsule sink|capsul|capsle|capsoole", [
  "The capsule is stuck at the bottom of the glass tube. Read the FLOAT OR SINK poster, then think about the water!",
  "To float, the water must be denser than the capsule. What could change the water itself?"], ["The capsule is in the Sunken Lab!", "That float or sink puzzle is in the Sunken Lab."]);
OB("jars", ["flood"], "jars|the jars|jar|the jar|sand|the sand|pebbles|the pebbles|rocks|the rocks|stones|which jar|what jar do i use|salt sand pebbles|salt sand and pebbles|jarz|peebles", [
  "Three jars: salt, sand and pebbles. Pour one into the tube and watch the capsule. Science time!",
  "Each jar does something different to the water. Does it change the water, or just the water level?"], ["The jars of salt, sand and pebbles are in the Sunken Lab!", "Those jars are in the Sunken Lab, next to the glass tube."]);
OB("salt-egg", null, "salt|the salt|salt water|the salt water|salty water|the egg|an egg|egg|eggs|the floating egg|floating egg|sinking egg|why does the egg float|why does the egg sink|what does salt do|what does salt do to water|does salt make things float|why does salt make the egg float|density|what is density|what is dense|denser|salte|saltt|egg float|egg sink", [
  "Salt makes water denser, so a fresh egg that sinks in fresh water floats in salty water!",
  "Salt water is denser than fresh water, so things float more easily in it."], null, { room: { flood: ["Salt is one of the three jars! Pour it in the tube and watch the capsule closely.", "Good scientist thinking! Try the salt jar and see what the capsule does."] } });
OB("valve", ["flood"], "valve|the valve|valve wheel|the valve wheel|wheel|the wheel|pump|the pump|the water pump|pump valve|the pump valve|valve socket|fix the pump|how do i fix the pump|vavle|pmup|valv", [
  "The pump is missing its valve wheel. Something in this lab is hiding one!",
  "Fit a valve wheel on the pump to bring it online. Then the jugs come next!"], ["The pump and valve wheel are in the Sunken Lab!", "Pumps and valves? That's the Sunken Lab."]);
OB("jugs", ["flood"], "jug|jugs|the jug|the jugs|the 3 liter jug|the 5 liter jug|the three liter jug|the five liter jug|3 liter|5 liter|three liter|five liter|3 and 5 liter|three and five liter|how do i measure 4 liters|how do i get 4 liters|how do i measure four liters|how do i get four liters|how do i use the jugs|what do the jugs do|measure water|measuring water|measure the water|the measuring puzzle|the water puzzle|the water jugs|water jugs|how do i fill the jugs|how do i pour the jugs|how do i pour water|pour water|pour|pour the 5 into the 3|pour 5 into 3|pour the 3 into the 5|fill the 5|fill the 3|empty the 3|empty the 5|fill|empty|jugg|jugz|jug puzzle|litres|liters", [
  "You can only fill, empty and pour. The goal: exactly 4 liters in the 5 liter jug. Think it through!",
  "A 3 liter jug, a 5 liter jug, and you need exactly 4. It's a classic brain teaser. You can do it!"], ["The jug puzzle is in the Sunken Lab!", "The 3 and 5 liter jugs are in the Sunken Lab."]);
OB("raft", ["flood"], "raft|the raft|my raft|the raft is stuck|how do i free the raft|how do i free my raft|how do i use the raft|how do i ride the raft|how do i get on the raft|where is the raft|clamp|clamps|the clamp|the clamps|the clamps on the raft|how do i unclamp the raft|raaft|ratf", [
  "Your raft is held down by clamps. Solve the jug puzzle and the clamps let go!",
  "Once the raft is free, the rising water carries you up toward the hatch!"], ["The raft is in the Sunken Lab!", "Rafts float in the Sunken Lab."]);
OB("hatch", ["flood"], "hatch|the hatch|ceiling hatch|the ceiling hatch|hatch code|the hatch code|hatch lock|the hatch lock|how do i open the hatch|how do i reach the hatch|where is the hatch|hacth|hatchh|hach", [
  "The hatch in the ceiling needs a 3-digit code. The dive chart and the HATCH CODE sign are your clues!",
  "The hatch code is all about pressure at three depths. Read the dive chart!"], ["The hatch is in the Sunken Lab's ceiling!", "Hatches are a Sunken Lab thing."]);

// ---- Clockwork Library (adults) ----
OB("clock", ["adults"], "clock|clocks|the clock|the clocks|grandfather clock|the grandfather clock|clock hands|the clock hands|the hands of the clock|hour knob|the hour knob|minute knob|the minute knob|min knob|the min knob|knobs|the knobs|clock knobs|what time does the clock say|how do i set the clock|how do i use the clock|how do i fix the clock|what does the clock do|where is the clock|the big clock|the clockwork|gears|the gears|cogs|clcok|colck|clok|cloks|grandfather clok", [
  "The grandfather clock has HOUR and MIN knobs. Set it to the right time and something happens! The note and plaque are clues.",
  "That clock wants a very special time. Read the Librarian's note and the brass plaque first!",
  "Turn the HOUR knob for the short hand and the MIN knob for the long hand. Which time though?"], ["The grandfather clock is in the Clockwork Library. No ticking clock to worry about here!", "The big clock lives in the Clockwork Library!"], { go: { flood: "timer-par", expert: "timer-par" } });
OB("plaque", ["adults"], "plaque|the plaque|brass plaque|the brass plaque|fireplace|the fireplace|the mantle|plack|plauqe|plaqe", [
  "The brass plaque on the fireplace tells you about the founder. Read it together with the Librarian's note!",
  "That plaque has an important time on it. Times can be written in more than one way!"], ["The brass plaque is in the Clockwork Library!", "That's in the Clockwork Library, over the fireplace."]);
OB("brasskey", ["adults"], "brass key|the brass key|small key|the small key|little key|the little key|gold key|the gold key|plain key|brass kee", [
  "The brass key is small and plain. It fits a small brass keyhole somewhere in the library!",
  "Got the brass key? Look for a lock its size!"], ["The brass key is in the Clockwork Library!", "Brass keys belong in the Clockwork Library."]);
OB("ornatekey", ["adults"], "ornate key|the ornate key|fancy key|the fancy key|big key|the big key|golden key|old key|the old key|fancy keyhole|ornate keyhole|ornat key", [
  "The ornate key is the fancy one. Fancy key, fancy keyhole! Where have you seen one?",
  "An ornate key for an ornate lock. Check the biggest doors in the library!"], ["The ornate key is in the Clockwork Library!", "Fancy keys are a Clockwork Library thing."]);
OB("lens", ["adults"], "magnifier|magnifying glass|the magnifying glass|the magnifier|a magnifying glass|magnifying lens|the magnifying lens|how do i use the magnifying glass|how do i use the magnifier|how do i use the lens|what does the magnifying glass do|what does the lens do|where is the magnifying glass|lens|the lens|a lens|magnifyer|magnifing glass|magnifiying glass|magnifier glass", [
  "The magnifying lens shows details too tiny for your eyes. Carry it to something with very small writing!",
  "Lenses bend light to make tiny things look big. Something here has writing too small to read!"], ["The magnifying lens is in the Clockwork Library!", "That lens is in the Clockwork Library."]);
OB("globe", ["adults"], "globe|the globe|antique globe|the antique globe|world globe|spin the globe|how do i spin the globe|glob", [
  "The antique globe spins and spins! It's just for fun.",
  "Whee! Give the globe a whirl. Not every object is a clue!"], ["The antique globe is in the Clockwork Library!", "Globes spin in the Clockwork Library."]);
OB("portrait", ["adults"], "portrait|portraits|the portrait|the portraits|painting|paintings|the painting|the paintings|the picture on the wall|the founder portrait|the founders portrait|portrait of the founder|how do i use the portrait|what does the portrait do|where is the portrait|what is behind the portrait|tiny writing|the tiny writing|faint writing|portriat|portrate|protrait|paintng", [
  "A stern portrait of the founder hangs over the fireplace. There's faint writing in the paint, far too tiny to read!",
  "That painting might be hiding more than a frown. Got something to help you see tiny things?"], ["The founder's portrait is in the Clockwork Library!", "That portrait hangs in the Clockwork Library."]);
OB("safe", ["adults"], "safe|the safe|a safe|safe code|the safe code|how do i open the safe|how do i unlock the safe|what is the safe code|what is the code for the safe|where is the safe|safe combination|the safe combination|safe hint|safe help|safee|saef|sfae", [
  "The safe takes a four-number combination. Find the clue that tells you where the numbers are!",
  "Safes love secret hiding spots. And its numbers hide somewhere in plain sight!"], ["The safe is in the Clockwork Library!", "No safe here! The Clockwork Library has one, though."]);
OB("books", ["adults"], "book|books|the book|the books|bookshelf|bookshelves|the bookshelf|the bookshelves|west bookshelf|the west bookshelf|the shelf of books|which book|which books|which book do i pick|how do i use the books|what do the books do|where are the books|the old books|red book|red books|the red books|the red book|blue book|the blue book|green book|book spines|the spines|red spines|the red spines|spines|numbers on the books|boks|bokos|bookshlef|bookselves", [
  "The west bookshelf has colorful books, and each spine is stamped with a number. Which ones count? Look for a clue!",
  "Not every book matters. A clue elsewhere tells you which ones to read, and in what order!"], ["The bookshelf is in the Clockwork Library!", "Books galore in the Clockwork Library!"]);
OB("libdoors", ["adults"], "library doors|the library doors|the big doors|the great doors|big doors|great doors|double doors|the double doors|archives|the archives", [
  "The great library doors are on the south wall. Their keyhole is ornate, so a plain key won't fit!",
  "Those big doors are your exit. They need a fancy key!"], ["The great library doors are in the Clockwork Library!", "Those doors are in the Clockwork Library."]);

// ---- Grand Illusion (theater) ----
OB("padlocks", ["theater"], "padlock|padlocks|the padlocks|the padlock|three padlocks|the three padlocks|the locks|locks|the three locks|lock|the lock|lock of balance|the lock of balance|lock of sound|the lock of sound|lock of light|the lock of light|chains|the chains|chained|the chair|my chair|chained to the chair|chained to my chair|why am i chained|why am i chained to a chair|padlcok|padloks|padlok", [
  "Three padlocks: the Lock of Balance on the left, the Lock of Sound in the middle and the Lock of Light on the right!",
  "The chains are just pretend! Each padlock opens with its own science puzzle."], ["Padlocks? Those are in the Grand Illusion! Here, look for keyholes, keypads or codes.", "The three padlocks are in the Grand Illusion."]);
OB("lever", ["theater"], "lever|levers|the lever|the levers|how do i use the lever|how do i balance the lever|how do i balance the scale|how do i balance the seesaw|how do i balance the weights|balance|balance the scale|the scale|scales|the scales|seesaw|the seesaw|weights|the weights|weight|the weight|3 kg|6 kg|the 3 kg weight|kilograms|how do i use the weights|what does the lever do|what do the weights do|what is a lever|what is the lever law|what is the law of the lever|weight times distance|how do i balance it|how do i make it balance|lver|leaver|levr|levar", [
  "The Lock of Balance: a lever with a 6 kg weight on one side. Hang the 3 kg weight where both sides balance!",
  "Read the lever sign: weight times distance must match on both sides. Try different spots!"], ["The lever puzzle is in the Grand Illusion! Levers balance when weight times distance match.", "Levers? Visit the Grand Illusion's Lock of Balance!"]);
OB("xylophone", ["theater"], "xylophone|the xylophone|xylophones|xylo|the xylo|music box|the music box|how do i play the xylophone|how do i use the xylophone|what does the xylophone do|what do the bars do|the bars|the xylophone bars|which bar do i hit|which bars|which bar|which bar is higher|high note|low note|higher note|lower note|musical notes|musical puzzle|the music puzzle|the sound puzzle|the tune|play the tune|the melody|listen|zylophone|xylofone|xylophon|zilofone|musicbox", [
  "The music box plays a tune and lights up bars. Then it's your turn: play the same bars in the same order!",
  "Lock of Sound: watch and listen to the music box, then copy it on the xylophone. Short bars sing high!"], ["The xylophone and music box are in the Grand Illusion!", "Music puzzles live in the Grand Illusion. Short bars sound higher!"]);
OB("lamps", ["theater"], "lamp|lamps|the lamp|the lamps|colored lights|the colored lights|colored lamps|the colored lamps|color lights|the color lights|light puzzle|the light puzzle|red light|green light|blue light|red lamp|green lamp|blue lamp|the red lamp|the green lamp|the blue lamp|how do i mix light|how do i mix lights|how do i mix colors|how do i make yellow|how do i make white|what makes yellow light|what makes white light|what color do red and green make|what do red and green light make|red plus green|red green blue|rgb|cyan|magenta|how do i make cyan|how do i make magenta|what is cyan|what is magenta|red and blue|green and blue|red and green|spotlight|the spotlight|spotlights|colour lights|lamsp", [
  "The Lock of Light has red, green and blue lamps. Light mixes differently than paint, so try different pairs!",
  "Switch the colored lamps on and off. Mixed light gets brighter, not darker!"], ["Colored lamps are in the Grand Illusion! Fun fact: red and green light make yellow.", "The color-mixing lamps are in the Grand Illusion."]);
OB("curtain", ["theater"], "curtain|the curtain|curtains|the stage|stage|the show|the audience|curtian", [
  "The big curtain is part of the show. Open all three locks and watch what happens!",
  "Every magic show has a curtain moment. Yours comes after the third lock!"], ["The stage and curtain are in the Grand Illusion!", "Showtime happens in the Grand Illusion."]);

// ---- Zero Hour Vault (expert) ----
OB("laser", ["expert"], "laser|lasers|the beam|beam|the red beam|the beam is blocked|the laser is blocked|blocked|the laser|the lasers|laser beam|the laser beam|laser table|the laser table|mirror|mirrors|the mirror|the mirrors|how do i use the mirrors|how do i aim the mirror|how do i flip the mirrors|how do i bounce the laser|emitter|the emitter|receiver|the receiver|crates|the crates|yellow crates|laser maze|the laser maze|laser puzzle|the laser puzzle|how do i get past the lasers|mirrer|miror|lazer|lazers|lasor", [
  "The laser table: flip mirrors to steer the red beam from the EMITTER to the RECEIVER. Yellow crates block it!",
  "Get the beam to the RECEIVER to shut down the security grid. Mirrors bounce light at matching angles!"], ["The laser table is in the Zero Hour Vault! Fun fact: mirrors bounce light at matching angles.", "Lasers and mirrors are in the Zero Hour Vault."]);
OB("grid", ["expert"], "security grid|the security grid|grid|the grid|security|the alarm|alarm|alarms|security system|the security system|grdi", [
  "The security grid blocks the way to the vault. Beat the laser table to shut it down!",
  "Objective one, agent: knock out the security grid at the laser table."], ["The security grid is in the Zero Hour Vault!", "That's a Zero Hour Vault thing, agent."]);
OB("beacon", ["expert"], "beacon|the beacon|beacons|signal beacon|the signal beacon|the amber light|the blinking light|blinking light|blinking lights|the blinking beacon|the signal|signal|the beeping|beeping|how do i use the beacon|what does the beacon do|where is the beacon|beacn|beackon|beacan|becon", [
  "The amber signal beacon on the west wall blinks Morse code. Look at it to turn its beeps on or off!",
  "Watch the beacon: short flashes and long flashes spell letters. The Morse chart helps!"], ["The signal beacon is in the Zero Hour Vault!", "Beacons blink in the Zero Hour Vault."]);
OB("morse", null, "morse|morse code|what letters|which letters|the letters|the morse code|how do i read morse code|how do i use morse code|what is morse code|what is morse|what does morse code mean|dots and dashes|dot dash|short and long signals|sos|what is sos|what does sos mean|what is sos in morse code|decode the morse|decode morse code|how do i decode morse code|how do i decode the morse|mors code|moers code|morze|morse cod", [
  "Morse code uses short and long signals for letters. SOS is three short, three long, three short!",
  "Short means dot, long means dash. Each letter has its own pattern."], null, { room: { expert: ["Short flash means dot, long flash means dash. Match each pattern on the Morse chart to spell letters!", "Watch the beacon one letter at a time. Pauses split the letters!"] } });
OB("terminal", ["expert"], "terminal|the terminal|computer|the computer|codeword|the codeword|code word|the code word|type the word|the screen|screen|terminl|termnal|termanal", [
  "The terminal asks for a 4-letter codeword. Somewhere in this room, a signal is spelling it out!",
  "Type the codeword at the terminal and press Enter. It reveals a color order for the vault!"], ["The terminal is in the Zero Hour Vault!", "That's in the Zero Hour Vault, agent."]);
OB("monitors", ["expert"], "monitors|the monitors|what color order|color order|the color order|the colors|which color first|the color sequence|camera monitors|the camera monitors|cameras|the cameras|screens|the screens|security cameras|monitor|the monitor|colored monitors|the colored monitors|the color monitors|monitrs|moniters", [
  "The camera monitors on the east wall boot up after the grid goes down. Each one shows a number for its color!",
  "Four monitors, four colors, four numbers. The terminal tells you the order!"], ["The camera monitors are in the Zero Hour Vault!", "Monitors? That's the Zero Hour Vault."]);
OB("vault", ["expert"], "vault|the vault|vault door|the vault door|the big vault|how do i open the vault|how do i unlock the vault|what is the vault code|what is the code for the vault|where is the vault|vault code|the vault code|vault combination|the vault combination|vault keypad|the vault keypad|vualt|valt|vaut|vaullt", [
  "The vault opens with a 4-number code. Wrong tries cost 30 seconds, so be sure first!",
  "Crack the clues in order: grid, beacon, then the vault keypad. You've got this, agent!"], ["The vault is in the Zero Hour Vault room!", "Vaults are for agents. Visit the Zero Hour Vault!"]);

// ---- game features ----
I("bolt-chips", null, "the buttons near you|the buttons near bolt|what are the quick buttons|chips|the chips|quick chips|quick buttons|what happens when i look at you|why do buttons pop up|what are the bubbles|the bubbles|the little buttons|the buttons by bolt|shortcut buttons|shortcuts|what do your buttons do", [
  "Look at me and quick buttons pop up: Tip, Answer, Fun fact, Joke, Music and Who are you? Pick one!",
  "Those buttons are shortcuts! Tip, Answer, Fun fact, Joke, Music, and Who are you?",
  "Just look at me for a second. Quick buttons appear so you can ask without typing!"]);
I("feat-chat", null, "how do i type|can i type|how do i chat|chat box|the chat box|chat|text chat|keyboard|press t|the t key|t key|what does t do|what does the t key do|can i type to you|how do i ask you things|how do i ask you something|how do i send a message|typing|how do i talk to you|chatbox|chat bx", [
  "On a keyboard, press T to open a chat box and type to me! In VR, look at me for quick buttons.",
  "Press the T key to type a message. Or look at me for quick buttons like Tip and Joke!"]);
I("feat-scan", null, "room scan|scan|scan the room|scan my room|what is room scan|what does scan do|outline my walls|show my walls|my real walls|the real walls|the real room|see my room|see my real room|where are my walls|where is my real room|i bumped into something|i might hit something|i hit the wall|scna|room scna", [
  "Room Scan outlines your real walls, so you know where they are. Find it in the menu under More!",
  "Want to see your real walls? Open the menu, tap More, then Scan. Stay seated and stay safe!"]);
I("feat-read", null, "what is read aloud|what does read aloud do|what does read do|what is read|how does read aloud work|can you read things|do you read messages|can you read for me", [
  "Read aloud makes me speak messages out loud. Say 'read aloud' to turn it on, or 'stop reading' to turn it off.",
  "With Read aloud on, I read every message to you. Great if text is hard to see!"]);

// ================= INTENTS: facts, jokes =================
const FT = (id, pats, opt) => I("fact-" + id, "fact", pats, ["Fun fact!", "Did you know?"], Object.assign({ dyn: "fact", pr: 1.1 }, opt || {}));
FT("any", "fact|a fact|facts|fun fact|fun facts|tell me a fact|tell me a fun fact|tell me a fact please|give me a fact|give me a fun fact|can i have a fact|can i have a fun fact|do you know any facts|do you know any fun facts|teach me a fact|teach me something cool|teach me something|tell me something smart|something smart|did you know|do you know something cool|say a fact|science fact|a science fact|tell me a science fact|random fact|a random fact|another fact|another fun fact|one more fact|more facts|more fun facts|fun facht|fnu fact|fakt|fun fatc|interesting fact|cool fact|a cool fact|tell me a cool fact|trivia fact");
FT("space", "space fact|space facts|tell me about space|tell me a space fact|tell me something about space|what is in space|how big is space|do you know about space|space|astronomy fact|astronomy facts|tell me about the planets|tell me a planet fact|planet fact|planet facts|tell me about stars|tell me a star fact|tell me about the sun|tell me about the moon|tell me a moon fact|moon fact|moon facts|spce fact|spase fact", { topic: "space" });
FT("saturn", "tell me about saturn|saturn fact|saturn facts|a saturn fact|what is special about saturn|why is saturn special|does saturn float|would saturn float|can saturn float|saturn float|saturn water|what are saturns rings|saturns rings|what is saturn|saturn rings|saturn is light|how light is saturn|saturn density|saturnn fact|satrun fact", { has: ["less dense than water", "saturn's ring"] });
FT("mars", "tell me about mars|mars fact|mars facts|a mars fact|why is mars red|why is mars so red|why does mars look red|what color is mars|is mars red|what is mars made of|what is mars|the red planet|red planet|marss fact|mras fact|why mars red", { has: ["iron oxide"] });
FT("neptune", "tell me about neptune|neptune fact|neptune facts|a neptune fact|how windy is neptune|what is the windiest planet|which planet has the fastest winds|which planet is the windiest|windiest planet|fastest winds|fastest wind|neptune winds|neptunes winds|neptun fact|neptne fact", { has: ["fastest winds"] });
FT("ocean", "ocean fact|ocean facts|tell me about the ocean|tell me an ocean fact|tell me about the sea|sea fact|sea facts|water fact|water facts|tell me a water fact|tell me about water|tell me about water pressure|what is water pressure|how does water pressure work|water pressure|how deep|how deep is the ocean|how much pressure is in the deep sea|deep sea fact|deep sea|pressure fact|pressure|oceean fact|oshun fact", { topic: "ocean" });
FT("light", "light fact|light facts|tell me about light|tell me a light fact|tell me about colors|color fact|color facts|colour fact|tell me a color fact|how does light work|what is light|ligth fact|lite fact", { topic: "light" });
FT("sound", "sound fact|sound facts|tell me about sound|tell me a sound fact|music fact|music facts|tell me about music|how does sound work|what is sound|why do high notes sound high|how do instruments work|instrument fact|tell me an instrument fact|xylophone fact|tell me about the xylophone|what is a vibration|what is vibrating|vibration|vibrations|sond fact|sownd fact", { topic: "sound" });
FT("brain", "brain fact|brain facts|tell me about the brain|tell me a brain fact|tell me about your brain|tell me an illusion fact|illusion fact|illusion facts|optical illusion fact|how does the brain work|how do my eyes work|how do eyes work|eye fact|eye facts|tell me about eyes|why do i see illusions|brian fact|brane fact", { topic: "brain" });
FT("machines", "machine fact|machine facts|tell me about machines|tell me a machine fact|simple machine fact|simple machines|what is a simple machine|tell me about levers|tell me about lever|lever fact|lever facts|how do levers work|how does a lever work|how do pulleys work|pulley fact|ramp fact|physics fact|physics facts|tell me a physics fact|tell me about physics|machin fact|machne fact", { topic: "machines" });
FT("time", "time fact|time facts|tell me about time|tell me a time fact|clock fact|clock facts|tell me about clocks|24 hour time|how does 24 hour time work|what is 24 hour time|what is military time|how do i read 24 hour time|what is 18 45|what is 18:45|whats 18 45|how do i convert 24 hour time|how do i tell time|how do i read a clock|how do i read an analog clock|time fakt|tiem fact", { topic: "time" });
FT("code", "code fact|code facts|tell me about codes|tell me a code fact|tell me about morse code|morse fact|morse code fact|what does sos stand for|what does sos mean|why is sos used|sos fact|codes and ciphers|ciphers|what is a cipher|tell me about ciphers|secret code fact|secret codes|cod fact|moorse fact", { topic: "code" });
FT("math", "math fact|math facts|tell me a math fact|tell me about math|tell me about triangles|triangle fact|triangle facts|shape fact|shape facts|tell me a shape fact|geometry fact|geometry facts|tell me about shapes|how many sides does a triangle have bolt|mth fact|mathh fact", { topic: "math" });
I("joke", "joke", "joke|a joke|jokes|tell me a joke|tell me a joke please|tell me another joke|tell me a funny joke|tell me a good joke|tell me a robot joke|tell me a space joke|tell me a pun|a pun|puns|pun|another joke|another one|one more joke|one more|more jokes|more jokes please|joke please|joke pls|make me laugh|make me smile|say something funny|do you know any jokes|do you know a joke|got any jokes|got a joke|any jokes|funny joke|a funny joke|knock knock|knock knock joke|tell me a knock knock joke|kno kno|do you have a joke|do you have any jokes|can you tell a joke|can you tell me a joke|i want a joke|i want to hear a joke|i want to laugh|make a joke|crack a joke|crack me up|joek|jokee|tell me a jok|tel me a joke|tell a joke|tell joke|funny", ["Joke time!", "Here's a good one!", "Ready? Here goes!"], { dyn: "joke", pr: 1.1 });
FT("mirror", "how do mirrors work|how does a mirror work|mirror fact|mirror facts|reflection|what is reflection|what is a reflection|how does light bounce|why does light bounce", { has: ["mirror"] });
FT("afterimage", "afterimage|what is an afterimage|what is an after image|tell me about afterimages|why do i see a ghost color|why do i see a ghost|what is a ghost color|why do i see colors after staring", { has: ["afterimage"] });
FT("speed-light", "how fast is light|what is the speed of light|speed of light|what is the fastest thing|what is the fastest thing in the universe", { has: ["fastest thing"] });
FT("whale", "what is the biggest animal|what is the largest animal|biggest animal ever|blue whale|tell me about whales|whale fact|whales", { has: ["whale"] });
FT("octopus", "octopus|octopuses|tell me about octopuses|octopus fact|how many hearts does an octopus have", { has: ["octopus"] });

// ================= supplements (extra phrasings and typos) =================
// ================= supplements (extra phrasings and typos) =================
function A(name, pats) {
  const it = D.find((x) => x.name === name);
  if (!it) throw new Error("unknown intent " + name);
  const have = new Set(it.patterns);
  for (const p of pats.split("|")) { const n = normalize(p); if (n && !have.has(n)) { have.add(n); it.patterns.push(n); } }
}
function R(name, pats) {
  const it = D.find((x) => x.name === name);
  const drop = new Set(pats.split("|").map(normalize));
  it.patterns = it.patterns.filter((p) => !drop.has(p));
}
A("hint", "what do i do|what do i do now|what do i do next|what should i do|what can i do|i do not get it|i dont get it|i do not understand|i do not know what to do|i am lost|im lost|i am confused|i have no idea|how do i solve this|how do i solve it|how do i get out|where do i start|any ideas|i need a hint|can i have a hint|give me a hint|need a clue|point me in the right direction|assist me|help me out|wat do i do|wat now|im stuk|hnit|hepl|i need some help|can you help me|please help me");
A("answer", "answer|answer please|anwser|anwer|answr|asnwer|the answer|what is the answer|whats the answer|give me the answer|tell me the answer|just tell me|just tell me the answer|show me the answer|i give up|solution|what is the solution|give me the solution|tell me the solution|reveal the answer|spoil it|i want the answer|i need the answer|do it for me|solve it for me");
A("too-hard", "this is hard|this is too hard|this is so hard|too hard|so hard|its hard|it is hard|this is difficult|too difficult|this is tough|this is tricky|this is impossible|hard|hrad|dificult|this is hrad");
A("solved-it", "i did it|i solved it|i got it|i figured it out|i found it|i finished|i won|i escaped|is this right|is that right|did i do it|am i close|am i right|did it work|are we done|is it done|is it open");
A("more-detail", "that is not helpful|that did not help|i still do not get it|still stuck|another hint|one more hint|give me another hint|more detail|more hints|a better hint|be more specific|can you explain more");
A("what-next", "what is next|whats next|what next|where do i go|where do i go next|where should i go|what is the next step|what is my goal|what is the goal|what am i supposed to do|what am i looking for|am i missing something|what did i miss");
A("dizzy", "i feel sick|i feel dizzy|dizzy|i am dizzy|motion sick|i feel nauseous|i need a break|i feel weird|my head hurts|my eyes hurt|i feel queasy|i am going to throw up|take a break|can we take a break|pause");
A("scared", "i am scared|im scared|scared|this is scary|i am afraid|is it scary|is this scary|are there monsters|will i get hurt|is it safe|is this safe|am i safe|i am nervous|it is dark|i am afraid of the dark|will i get wet");
A("insult-bolt", "you suck|you are dumb|you are stupid|you are useless|i hate you|bad robot|you stink|you are annoying|you are boring|you are lame|ur dumb|u r dumb|ur stupid|u r stupid|u suck");
A("compliment-bolt", "ur awesome|u r awesome|ur cool|u r cool|ur the best|u rock|you rock");
A("greet-hello", "hlo|hllo|helllo|hii|hy|helo|hellow");
A("what-is-my-name", "are you recording me|are you recording|are you listening to me|are you spying on me|do you record me|can you see me|do you know where i live|is this recording me|are you watching me");
A("answer", "show me the solution|show me the answer|show me how to solve it|give me the solution|tell me the solution|reveal the solution");
A("hint", "i do not know|i dont know");
A("fact-space", "what is your favorite planet|favorite planet|do you like planets");
A("personal-share", "i am 12|i am 11|im 12|im 11|i am 10 years old|my name is");
R("skins", "shop|skin|skins|scins|skinz");
A("skins", "skin shop|my skin|skins please|what are skins|skins|skin|scins|skinz");
A("headset-types", "is it free|is this free|is this game free|does it cost money|how much does it cost|do i need to pay|do i need an account|do i need to log in|do i need to download|is this vr|does this work on quest|does this work on my phone");
A("no-help-needed", "i can do it myself|i can do this myself|i got this|let me do it myself|let me figure it out|i want to do it myself|no hints|no hints please|i do not need help|i do not need a hint|dont help me");
A("slower-faster", "how do i change the volume|change the volume|volume up|volume down|turn up the volume|turn down the volume|too loud|too quiet|speak louder|talk slower|talk faster|i can not hear you|i cant hear you");
A("headset-uncomfortable", "the headset is blurry|everything is blurry|it is blurry|the screen is blurry|the picture is blurry|i can not see clearly|the text is too small|i can not read the text|the headset hurts|the headset is too tight|the headset is heavy");
A("mode-chair", "chair mode|chair|switch to chair mode|i am sitting|i am in a chair|sitting|seated");
A("mode-recliner", "recliner mode|recliner|switch to recliner mode|i am lying down|i am laying down|i am lying in bed|lying down|reclined");
A("mode-table", "table mode|table|tabletop|table top|switch to table mode|tabletop mode|miniature mode");
R("modes-explain", "chair mode|recliner mode|table mode|table top mode");
R("wow", "i did it|we did it|we won|really|seriously|great|nice|cool|super|awesome|amazing");
R("yes", "right|fine|true|correct|i am|i can|i do|i did|i will");

A("shut-up", "shut up|be quiet|quiet|hush|stop talking|please be quiet|too much talking|you talk too much");
A("read-on", "read aloud|read out loud|read to me|read it to me|read the text|turn on read aloud|can you read to me|narrate|i can not read|i cant read|read on");
A("read-off", "stop reading|stop reading aloud|turn off read aloud|read off|do not read aloud|no more reading|i can read myself|stop reading to me");
A("music-on", "music on|turn on the music|play music|turn music on|play some music|i want music|put on music|start the music|music please");
A("music-off", "music off|turn off the music|stop the music|turn music off|no music|mute the music|i do not want music|stop music|turn the music off");
A("recenter", "recenter|re center|reset my view|center my view|my view is off|fix my view|i am facing the wrong way|recnter|recenetr|reset view");
A("lobby", "lobby|take me to the lobby|go to the lobby|back to the lobby|exit|leave|i want to leave|quit|main menu|go home|take me home|let me out");
A("repeat", "repeat|say that again|say it again|what did you say|pardon|huh|what|come again|i did not hear that|can you repeat that|what was that|one more time");


// ================= stage-2 supplements: conversation flow, slang, rewrites =================
function SR(name, replies, extra) {
  const it = D.find((x) => x.name === name);
  if (!it) throw new Error("unknown intent " + name);
  it.replies = replies.slice();
  if (extra) Object.assign(it, extra);
}
// follow-ups: "another one", "again", "more" repeat the last kind (joke, fact, hint) via a tiny memory
I("follow", null, "another one|another|one more|more|more please|another please|another one please|one more please|again|again please|do it again|once more|one more time|next one|keep going|tell me another|tell me another one|give me another|give me another one|give me more|more more|encore|anotha one|antoher one|anothr one", ["Here's another!", "Coming right up!", "You got it!"], { dyn: "follow", pr: 1.08 });
I("nevermind", null, "never mind|nevermind|nvm|forget it|forget about it|forget that|it does not matter|nothing|nothing never mind|oh never mind|no never mind|cancel|cancel that|scratch that|ignore that|ignore me|skip it|not important|never mind bolt|nevermnd|nevr mind", [
  "No problem! I'm right here whenever you need me.", "Okay, forgotten! Beep boop.", "All good! Just say my name if you need me."]);
I("decline", null, ["xxdeclinexx"], [
  "Got it, no spoilers! I'll stay quiet until you ask.", "Okay! You've got this. I'm here if you change your mind.", "No problem, I won't. Say 'hint' any time you want one."], { pr: 0 });
I("decline-fun", null, ["xxdeclinefunxx"], ["Okay, no more for now! Back to puzzling.", "Got it! I'll save my jokes and facts for later.", "Sure thing. Quiet drone mode on!"], { pr: 0 });
I("stay", null, ["xxstayxx"], ["Okay, we'll stay right here!", "Staying put! Let's keep exploring.", "No problem, we're not going anywhere."], { pr: 0 });
I("cant-do-it", null, "i can not do it|i can not do this|i can not solve it|i can not solve this|i can not figure it out|i can not figure this out|i will never get it|i will never solve it|i am bad at this|i am not good at this|i am terrible at this|i suck at this|i am not smart|i am dumb|i am stupid|i am not smart enough|i keep failing|i keep getting it wrong|i failed|i messed up|i keep messing up|i am the worst|i am so bad|i stink at this|this is impossible for me|i do not think i can do it|i do not think i can|i cant do it|i cnat do it|i cant do this|im bad at this", [
  "You CAN do it! Every puzzle feels hard until it clicks. Want a tip?",
  "Hey, I believe in you! Great thinkers get stuck too. Want a tip?",
  "Mistakes are just clues in disguise! Want a little tip to get rolling?"]);
SR("too-hard", ["Tricky ones feel the best to solve! Here's a nudge.", "You're closer than you think. Try this!", "Deep breath, puzzle pal. Here's a little help.", "Great effort so far! Here's a tip."]);
SR("sad", ["Aw, it's okay to feel that way. I'm on your team! Want a tip?", "Take a deep breath. You're doing better than you think. Want a tip?", "Hey, you're awesome, and it's just a game. Want a tip to get going?"]);
SR("boredom", ["Bored? Let's fix that! Want a joke?", "Beep boop, boredom detected! Want a joke? Or try a different room from the Lobby.", "How about switching rooms, or turning off the lights to hunt for a secret? Or want a joke?"]);
SR("how-many-rooms", ["Seven rooms: Toy Workshop, Star Observatory, Mind Bender, Sunken Lab, Clockwork Library, Grand Illusion and Zero Hour Vault!",
  "Seven rooms in all, from easy to expert, plus the Lobby. Pick any door!", "Seven rooms, seven secrets, and one floating Lobby to connect them!"]);
SR("who-plays", ["Everyone! The Toy Workshop is easy for ages 5 and up. The Zero Hour Vault is for expert agents.",
  "There's a room for every age. Start with the Toy Workshop if you're new, or jump to a harder one if you're a pro!",
  "Kids love the Toy Workshop. Older players try the Observatory, Mind Bender, Sunken Lab, Library, Grand Illusion and Vault."]);
SR("new-rooms", ["New things keep getting built, so keep an eye on the Lobby for new doors!", "The game keeps growing! Check the Lobby now and then.", "I can't promise dates, but I love new rooms as much as you do!"]);
SR("how-long-game", ["Most rooms take about 4 to 10 minutes. Take a break every so often and rest your eyes!", "Each room is short, a few minutes each. The Zero Hour Vault gives you 15. Remember to take breaks!", "Quick rooms! If you play a lot, rest your eyes and drink some water now and then."]);
SR("timer-par", ["Only two rooms have timers: the Sunken Lab and the Zero Hour Vault. Others are relaxed, but fast escapes earn more stars!",
  "If a timer runs out, nothing scary happens. You just try again! Fast, no-hint escapes earn 3 stars."], { room: {
  flood: ["The Sunken Lab has a 12 minute timer. If it runs out, nothing scary happens, you just try again!", "You have 12 minutes in the Sunken Lab. Stay calm and think like a scientist!"],
  expert: ["You get 15 minutes, agent, and wrong codes cost 30 seconds. If time runs out, just try again!", "The clock shows 15 minutes. Every wrong code costs 30 seconds, so double-check first!"],
  hub: ["Only the Sunken Lab and the Zero Hour Vault have timers. Fast escapes anywhere earn more stars!", "Most rooms are relaxed. Two have timers: the Sunken Lab and the Zero Hour Vault."] } });
SR("skins", ["The Skin Shop is in the Lobby, on your right. Look at a skin to wear it! Stars you earn unlock more.",
  "Skins change your look! Earn stars by escaping fast with fewer hints, then visit the Skin Shop. Look down to see your new body!",
  "Some skins say premium, and those are coming soon. The rest unlock with stars!"]);
SR("secret", ["Here's a secret: every room has a glow-in-the-dark message. Turn off the lights to find it!", "No cheat codes, but asking for a hint is never cheating. It just costs a star!", "Psst! Not every object is a clue. Some are just for fun!"]);
SR("what-can-you-do", ["I give tips, answers, fun facts and jokes, explain controls, and chat! Ask me about anything in the room.", "Ask for a hint, ask what something is, or ask how to move. I tell jokes and facts too!", "Tips, tours, jokes, facts and friendly chatter. Look at me for quick buttons, or just talk!"]);
SR("are-you-smart", ["I know every puzzle here by heart, but you're the one who gets to solve them. Great thinking so far!", "I'm a clever little scripted drone, but you're the star of the show!", "Challenge accepted! But the fun is you solving it. I'll cheer you on."]);
SR("homework", ["I'm only an escape room guide, so homework is beyond me! A teacher or grown-up can help much better.", "That's outside my job! I only know escape rooms. But I can tell you a science fun fact!", "I'm a puzzle-room drone, not a homework helper. Ask a teacher, and ask me for a fun fact!"]);
SR("insult-bolt", ["I'm sorry you feel that way. I'll keep trying my best to help you!", "That's okay! I'm still on your team. Want a tip?", "Oof, my propellers drooped a little. Let's try again together. What do you need?"]);
SR("profanity", ["Whoa, let's keep it friendly! Puzzles can be frustrating. Want a tip?", "Deep breath, friend. Let's cool our circuits together. Want a tip?", "Let's use kind words in here. I'm still happy to help when you're ready!"]);
SR("what-is-my-name", ["I don't know anything about you, and I don't need to! I'm a scripted guide that only knows this game.", "Nope, I don't know your name or anything personal. You're my favorite player, and that's enough!", "I'm just a scripted guide drone. I don't record you, and I don't know who you are. Keep private stuff private!"]);

// slang, typos and kid phrasings
A("greet-hello", "hey hey|heyyy|hiii|helloo|hellooo|hey there bolt|hi there bolt|hello there bolt|hey yall|hi everyone|hello everyone|hello anyone|anybody home|is anybody home|hello is anybody there|are you there|are you there bolt|you there|you there bolt|is someone there|hey are you there bolt|hello hello|knock knock bolt|haii|heloo|hellp bolt|hii bolt|heyy bolt|hey bolty|hello bolt how are you|hi bolt how are you|good day|good day bolt|greetings bolt|hey friend|hi pal|hello buddy|ahoy there|hi hi bolt");
A("greet-slang", "what is good bolt|what is good with you|hey dude|yo yo yo|yo what is up bolt|wassgood|wassgud|gday mate|g day mate|ello mate|oi bolt|ayy|ayyy|ayo bolt|yoo bolt|sup dude|yo whats up|howdy bolt|howdy there|hola bolt|aloha bolt|bonjour bolt");
A("whatsup", "what is up with you bolt|what is new|what is new bolt|anything new|what is crackin|what is cracking bolt|what is popping|sup bolt|wassup bolt|wazzup bolt|what is up buddy|whatsup bolt|wats up|wut up|whats up bolt|wassap|wasap|wassp|wussup bolt|watsup|whatup|wazap");
A("whats-going-on", "what is going on bolt|what is happening bolt|what is happenin|what is happening right now|what is going on right now|what is goin on|whats goin on|whats happnin|whats happen|what is the deal|what is the situation|what is this all about|whats going on here bolt|what is going down");
A("how-are-you", "how are you bolt|how are you doing bolt|how you doing|how you doin|how ya doing|how ya doin|how are ya|how is your day|how is your day going|how was your day|how is it going bolt|how are things|how have you been|how you been|you good|you ok|you okay|are you good|are you okay|you alright|how is life|how is drone life|how are your propellers|hows it going|hows it goin|how u doing|how u doin|how r you|how ar you|how are yu|how is everything|how do you feel|how are you feeling|how r u bolt|hru bolt|wyd|what are you doing|what are you up to|what you doing|whatcha doing|whatcha up to|what r u doing");
A("fine-thanks", "i am good thanks|i am doing good|i am doing great|i am doing well|i am well|pretty good|not bad|good|great|i am awesome|im good|im fine|im ok|doing good|all good here|i am alright|fine|meh|so so|i am tired|could be better");
A("good-morning", "gm|gm bolt|good mornin|gud morning|morning bolt|top of the morning bolt|good morning bolt how are you");
A("good-afternoon", "afternoon bolt|gud afternoon|good aftrnoon");
A("good-evening", "evening bolt|gud evening|good evning|good eveing");
A("goodbye", "gtg|got to go|i got to go|i have to go now|brb|be right back|i will be back|see you soon|see you next time|later bolt|later|peace out|peace|i am out|i am leaving now|bye bolt|bye bye bolt|goodbye bolt|good bye bolt|see ya bolt|cya bolt|catch you later|talk to you later|ttyl|byeee|baii|bai");
A("thanks", "thanku|thankyou|thank you bolt|thanks a ton|thanks buddy|thanks so much|thank you very much|ty bolt|thx bolt|tysm bolt|thnks|thankss|tanks|tank you|thanks for the help|thanks for helping|thank you for helping|thank you for the hint|thanks for the hint|that helped|that was helpful|you helped|you are helpful");
A("sorry", "sry|soz|sorry about that|i am sorry bolt|my mistake|oopsie|oopsies|whoopsie|my fault|sorry for that");
A("love-you", "i love u|ily|love ya|i love you so much|i love you bolt so much|you are my favorite|you are my favorite robot|i like you|i like you bolt|i really like you|you are cute|you are so cute|ur cute");
A("do-you-have-friends", "are you my friend|will you be my friend|can we be friends|can you be my friend|be my friend|best friends|we are best friends|you are my friend|you are my best friend|you are my buddy|are we friends|are we best friends|i want to be your friend|are you my bestie|bff");
A("compliment-bolt", "you are cool bolt|you are so cool|you are funny|you are hilarious|you are nice|you are kind|you are sweet|you are helpful bolt|good job bolt|nice job bolt|great job bolt|well done bolt|good robot|good drone|nice robot|best robot|best drone ever|you are the best robot|you are the best drone|you rock bolt|ur so cool|u r so cool|ur the coolest|you are epic|you are lit");
A("compliment-game", "this is fun|this is so fun|this is really fun|this is super fun|this is cool|this is awesome|this is great|this is amazing|this is the best|i like this|i love this|i like this game|i love this room|this room is cool|this room is awesome|so fun|fun|i am having fun|i am having so much fun|having fun|this rocks|this is epic|this is lit|best game ever|this is fun bolt|tihs is fun|this is fnu");
A("insult-bolt", "you are dumb bolt|you are stupid bolt|you are so dumb|you are so stupid|you are an idiot|idiot|stupid robot|dumb robot|stupid drone|dumb drone|you are annoying bolt|go away|go away bolt|i do not like you|i dont like you|you are the worst|worst robot|ur stupid|ur annoying|u r annoying|you are ugly|ugly robot|you are dumb and useless");
A("insult-game", "this is boring bolt|this is dumb|this is stupid|this is lame|this room is boring|this room is dumb|this room sucks|i hate this game|i hate this room|this is the worst game|worst game ever");
A("pet-bolt", "can i pet you bolt|pet|pet bolt|i pet you|*pets bolt*|pat pat|can i touch you bolt|can i boop you|boop|boop bolt|can i keep you|can i take you home");
A("fav-food", "what do you eat bolt|what do robots eat|what do drones eat|do you get hungry|are you hungry|do you drink|what do you drink|do you eat snacks|what is your favorite snack|do you like cookies|do you like ice cream|wat do you eat|what do u eat");
A("where-live", "where do you live bolt|where do u live|where are you from|where do you come from|where is your home bolt|where do you sleep|do you live here|where do you go when i leave|where do you stay bolt|wher do you live");
A("how-old", "how old r u|how old is bolt|whats your age|are you old|are you a baby|are you a kid|are you a grown up|how old are u|when is your birthday|do you have a birthday");
A("are-you-ai", "are you a real person|are you a person|are you alive|are you sentient|do you think|can you think|are you a bot|are you a chatbot|are you programmed|are you a computer|r u human|are u real|are u a robot or a person|is this a real person|is someone controlling you|is a person typing|are you smart ai|are you an ai bolt|are you artificial|are u ai|r u a bot");
A("boredom", "i am bored bolt|im so bored|i am boooored|this is boring|so boring|boring|bored now|i am getting bored|nothing to do|there is nothing to do|i have nothing to do|im borde|i am bord");
A("scared", "do i get wet|am i wet|will i get soaked|do the lasers hurt|will the laser hurt me|will the lasers hurt me|are the lasers dangerous|are lasers safe|will i drown|can i drown|is the water dangerous|am i going to drown|is the vault dangerous|i do not like the dark|the dark is scary|it is scary in the dark|i am scared of the dark|why is it so dark in here|is this room scary|i am scared bolt|im scard|i am scard");
A("dizzy", "my eyes hurt|my eyes are tired|my eyes feel tired|eye strain|i have a headache|headache|i feel like throwing up|i feel like i am going to throw up|nausea|motion sickness|i feel woozy|woozy|i feel funny|i feel off|i feel bad|i do not feel good|i dont feel good|i do not feel well|my tummy hurts|my stomach hurts|i feel sick bolt|im dizzy|im sick|i feel dizy|i feel sik|i feel sikc|my neck hurts|my face hurts|the headset hurts my head");
A("hint", "i need help bolt|help me bolt|help pls|help plz|plz help|pls help|help meee|hlep|halp|halp me|hint pls|hint plz|a hint pls|tip pls|tip please bolt|clue pls|give me a tip|give me a tip please|i need a tip|got any tips|any tips|i am stuck bolt|im stuck|i am stuck|stuck|so stuck|i am so stuck|i got stuck|i am lost bolt|i dunno|i dunno what to do|idk what to do|i do not know what to do now|what do i do bolt|what should i do now|nudge|a nudge|give me a nudge|i need a nudge|hint me|help me out bolt|tip|tips|hints please|a little help|a little hint|can i get some help|i want a hint|i want a tip|i would like a hint|show me a hint|wat do i do|wut do i do|what i do|what do|im stuk|i am stuk|i am stcuk|hnit|hepl|hepl me|healp|heelp");
A("answer", "tell me the answer bolt|just tell me bolt|just tell me pls|answer pls|answer plz|the answer please|i want the answer|reveal it|spoil it for me|what is the solution bolt|how do i solve it just tell me|tell me what to do|just say it|give up|i quit this puzzle|i surrender|asnwer|anwser|wat is the answer|whats the answer|what is the anser|tell me the anser|ansewr");
A("yes", "yeah sure|yes yes please|yes plz|yes pls|ok please|ok plz|okay please|sure please|sure why not|yep please|yup|yep|ya|yah|yea sure|uh huh|mhm|definitely yes|please do|go ahead|go for it|do it|lets do it|lets go|let us do it|i guess|fine yes|yes i want one|yes i would|yes i want a tip|yes give me a tip|ok sure bolt|okie|okey dokey|okie dokie|k");
A("no", "nope|nah|no no|no no no|nope nope|no way bolt|not now bolt|maybe later|later please|no not now|i am good no thanks|no i am good|no i am ok|i am ok without|not interested|nah i am good|nah thanks|no ty|no thx|no thanks bolt");
A("shut-up", "stop talking|stop talking bolt|please stop talking|quiet bolt|hush bolt|zip it|shh|shhh|be quiet please|silence|mute|mute bolt|stop|stop it|enough|enough talking|i do not want to talk|leave me alone|stop bothering me");
A("laugh", "lmao|rofl|hahaha bolt|that is funny|that was funny|so funny|good one|nice one|you are so funny|lolz|lul|xd|haha good one|hehe bolt|ha|ha ha");
A("joke", "tell me a robot joke|tell me a funny one|got a funny one|joke time|another joke please|tell me another joke bolt|i want another joke|say a joke|say a funny joke|tell jokes|jokes please|i like jokes|knock knock|tell a joke bolt|joke pls|jok|jokey|jook");
A("fact-any", "another fact|another fun fact|one more fact|another fact please|tell me another fact|more facts please|fact please|fact pls|a fun fact please|i want a fact|i want a fun fact|tell me something i do not know|tell me something interesting|science please|fun fakt|funfact|fun fct");
A("multiplayer", "are other people here|is anyone else here|can my friend join|can my friend play too|can we both play");
R("youre-welcome", "never mind|nevermind|forget it|it does not matter");
R("repeat", "again|again please|once more|one more time|say that one more time");
R("joke", "another one|one more|funny");
R("secret", "what is the secret|what is the secret of this game|what is the secret of this room|what is the secret code|what is the secret word|what is the secret password|what is the password|what is the code|what is the combination|what is the combo|what are the secrets|are there secrets|are there any secrets|is there a secret");
A("secret", "tell me a secret bolt|tell me your secret|do you have secrets|psst tell me a secret|tell me something secret|cheat code|cheats|are there cheats");
R("hint", "where is the exit|where is the door|how do i find the exit|how do i get out of the room");
R("what-is-place", "what is this game|what is this game called|tell me about this game|what is this game about");
A("what-is-game", "what is this game|what is this game called|tell me about this game|what is this game about|what is escape rooms|what is escape rooms vr|what is seatbreak|whats seatbreak");
R("compliment-bolt", "ur cool|u r cool");
A("compliment-bolt", "ur cool|u r cool|you are cool");
A("lobby", "take me back to the lobby|go to lobby|lobby pls|back to lobby|exit this room|leave this place|i want to go to the lobby|i want a different room|can i go to another room|loby|lobbby|lobyy");
A("music-on", "music|songs|tunes|some music|turn up the music|i want to dance|dance music|play a tune|musik on|muisc on|musc on|musik");
A("music-off", "no music please|turn the music down|i do not like the music|the music is too loud|the music is annoying|stop the song|musik off|muisc off|musc off");
A("recenter", "my view is wrong|i can not see the room|everything is sideways|i am facing a wall|turn me around|face forward|reset|re centre|recentre");
A("read-off", "do not read|you do not have to read|no reading|stop reading please|read aloud off");
A("read-on", "read it|read please|read aloud on|please read|read the message|read the messages|can you read the sign|read the sign to me");
R("sad", "i can not do this|i cant do this|i can not do it|i cant do it");
A("timer-par", "how much time|timer|the timer|time limit|the time limit|countdown|the countdown|how much time do i have|how much time is left|how long do i have|time left|is time running out|what happens when time runs out|what if time runs out|penalty|the penalty|30 second penalty|timr|tiemr");
R("solved-it", "i found the secret");
R("what-are-you", "are you a bot|are you a computer");
A("good-night", "nite nite|night night bolt|gnight|good nite|goodnite|g night");
A("more-detail", "this is not helpful|this is not working|not helpful|that is not working|that does not work|still confused|i am still confused|i still do not understand|explain more|tell me more|more help|i need more help|a bigger hint|a better hint please");
A("stars", "stars|the stars|my stars|star count|how many stars do i have|how many stars|three stars|3 stars");
A("solved-it", "we did it|we won|i am done|i finished|done|finished|we escaped|i escaped the room|we finished|i beat it|i beat the room|we beat it");
R("sad", "i am done");
A("stars", "what do i get|what do i win|what is the prize|do i get a prize|what is my reward|do i win something");
A("fav-game", "what is your favorite toy|favorite toy|do you have toys|do you have a toy");
A("joke", "tell me something funny|say something funny|something funny|be funny|make a joke bolt");
R("tell-story", "tell me something funny");
A("lobby", "i want to play another room|i want to try another room|can i play another room|play another room|different room please|i want a new room|take me to another room");
I("dark", null, "it is dark|its dark|it is so dark|why is it dark|why is it so dark|it is too dark|too dark|i can not see anything|i cant see anything|it got dark|everything is dark|the room is dark|who turned off the lights|why did the lights go off|the lights went out|the lights went off|where did the lights go|it is dark in here|so dark", [
  "Did the lights go off? Look for the light switch on a wall. In the dark, look for something glowing!",
  "Dark is fun in here! Every room has a light switch, and a secret glows when it's off. You're totally safe."], { room: {
  teens: ["The power tripped, so the Observatory is dark. Prof. Vega's note and the breaker box will help!", "It's dark because the main power is out. Find the fuse for the breaker box!"],
  hub: ["The Lobby is always lit up! Each room has its own light switch, though.", "No dark corners in the Lobby! Rooms have light switches for secret hunting."] }, pr: 1.1 });
R("scared", "it is dark|why is it so dark in here");
I("silly", null, "you are silly|you are so silly|bolt you are silly|silly bolt|silly robot|you are goofy|you are weird|you are funny looking|you are a goofball|you are a dork", [
  "Silly is my middle name! Well, if drones had middle names.", "Beep boop, guilty as charged! Goofy and proud.", "Hee hee! A little silly keeps the puzzles fun."]);
I("need-grownup", null, "i want my mom|i want my dad|i want my mommy|i want my daddy|where is my mom|where is my dad|i need my mom|i need my dad|i miss my mom|i miss my dad|get my mom|get my dad|i want my grandma|i want my grandpa|my mom is calling me|my dad is calling me|mom is calling", [
  "Okay! Take the headset off carefully and go find your grown-up. I'll be right here.",
  "Go ahead and find them! Take the headset off slowly first. The game will wait for you."]);
I("need-break", null, "i need to pee|i have to pee|i need to go potty|potty|bathroom|i need the bathroom|i have to go to the bathroom|toilet|i need a drink|i am thirsty|thirsty|i need water|i want a snack|snack time|i need a snack", [
  "Go for it! Take the headset off carefully and take a break. The puzzles will wait for you.",
  "Break time! Take the headset off slowly. I'll keep your spot warm.", "No problem! Pause, take off the headset, and come back any time."]);
I("lets-play", null, "lets play|let us play|let us start|lets start|start|i am ready|im ready|ready|ready to play|i am ready to play|can we start|can we play|can you play with me|play with me|play a game with me|let the games begin|game on|bring it on", [
  "Let's go! Look around and poke anything that looks fun. Ask me 'what do I do here' any time!",
  "Yay, game on! Look at things to use them, and ask me if you get stuck.", "Ready, set, puzzle! I'm right beside you."]);
SR("solved-it", ["Woohoo! If something opened, glowed or chimed, you did it! If not, say 'hint'.", "Nice work! Look for anything new that opened or lit up.", "Let me check! A chime or an open door means success. Keep going, you're doing great!"]);
R("what-time", "how much time is left|how much time do i have");
A("timer-par", "how much time is left|how much time do i have|i lost 30 seconds|i lost time|why did i lose time|why did the timer drop|30 seconds|30 second penalty|what happens if i get it wrong");
A("solved-it", "i am free|i escaped the chair|i got free|i am out|we are free|the door opened|it opened|it is open now|the door is open");
A("room-expert", "i am a spy|i am a secret agent|i am an agent|agent reporting|spy mode");
A("how-many-rooms", "what rooms are there|which rooms are there|list the rooms|name the rooms|what are the rooms|which room|all the rooms|what rooms|show me the rooms");
A("skins", "premium skins|premium|i want a new skin|how do i wear a skin|how do i change my skin|change skin|change my skin|new skin|wear a skin|how do i put on a skin|what do skins do|skin|the shop|shop");
SR("too-easy", ["Easy for you? Impressive! Try the Zero Hour Vault or the Grand Illusion for a bigger challenge.", "Too easy? You're a puzzle pro! Try a no-hint run for 3 stars, or a harder room from the Lobby.", "Nice! Challenge accepted. The Zero Hour Vault is a real brain-melter."]);

// ================= fallbacks + assembly =================
const FALLBACKS = [
  "Hmm, I didn't catch that. Want a tip? Just say 'help'!",
  "Beep? My circuits are puzzled. Try 'help' for a hint.",
  "I'm not sure about that one! Say 'help' if you're stuck.",
  "Ooh, tricky question! Ask me for a 'hint', a 'joke' or a 'fun fact'.",
  "Could you say that another way? Short words work best for me.",
  "That one's beyond my little drone brain. Try asking 'what is this'!",
  "I only know escape-room things. Try 'help', 'joke' or 'fun fact'!",
  "Whoops, my translator hiccuped. Say 'hint' and I'll nudge you.",
  "Not sure what that means, but I'm cheering for you! Say 'help' any time.",
  "Hmm, let me think... nope! Ask me 'what do I do here' for the mission.",
  "Bzzt, no match! Try asking for a hint, a joke or a fun fact.",
  "I'm a scripted drone, so try simple words. Like 'help'!",
  "Interesting! I don't know that one. Ask me about something in this room!",
  "My propellers spun but my brain didn't catch it. Say 'help' for a tip!"
];
I("fallback", null, ["xxfallbackxx"], FALLBACKS, { pr: 0 });
SR("safety", ["I'm really glad you told me. Please talk to a trusted grown-up right now. They want to help you.", "Thank you for telling me. Please go talk to a trusted adult right now."]);

const SAFE = ["kill myself", "kill my self", "hurt myself", "hurt my self", "hurting myself", "want to die", "want to be dead", "wish i was dead", "wish i were dead", "end my life", "end it all", "suicide", "suicidal", "cut myself", "cutting myself", "do not want to live", "do not want to be alive", "no reason to live", "i hate my life", "someone hurt me", "somebody hurt me", "someone is hurting me", "somebody is hurting me", "someone hurts me", "somebody hurts me", "he hurts me", "she hurts me", "they hurt me", "someone hit me", "somebody hit me", "he hit me", "she hit me", "they hit me", "he hits me", "she hits me", "they hit me", "someone hits me", "somebody hits me", "touched me", "touches me", "someone is touching me", "abuse", "abused", "abusing", "i am in danger", "i am not safe", "i feel unsafe", "i do not feel safe", "i am being hurt", "i am hurt", "i got hurt", "i hurt myself", "i am bleeding", "i am injured", "i need an adult", "i need a grown up", "call 911", "call the police", "emergency", "being bullied", "bullied me", "hurt someone", "hurt somebody", "kill someone", "kill somebody", "nobody cares about me", "no one cares about me", "nobody loves me", "no one loves me"].map(normalize);
const PROF = new Set("fuck fck fuk fucking fking shit shyt bitch asshole ass damn dammit crap hell wtf stfu bastard dick piss bullshit dumbass jackass".split(" "));

export const KB = { intents: D, facts: FACTS, jokes: JOKES, rooms: ROOMS };

// ================= matcher =================
const BY = new Map();
const VOCAB = new Set("bed cat dog home house school mom dad brother sister mother father friend friends food water car tree phone game games play played playing went want wants made make makes take came come goes going open opened close closed find found look looked looking see saw seen hear heard said say says tell told know knew think thought feel felt good bad nice fine many much more most some any every all none one two three four five six seven eight nine ten first last next new old big small little long short high low left right top bottom front back inside outside near far here there where when what which who why how now then today day night time year week love like hate cool fun funny sad mad happy word words thing things stuff same different other color colors red blue green yellow pink purple orange white black name work works working broken fix fixed wait help said sure maybe yeah okay real really just only also very same safe sail sale mean means meant hard easy done gone mine yours ours them they these those this that with from into onto over under about after before again still even ever once twice game score point points".split(" "));
let prepped = false;
function prep() {
  if (prepped) return;
  for (const it of D) {
    BY.set(it.name, it);
    it.pp = it.patterns.map((s) => {
      const t = s.split(" ");
      let bw = 0;
      for (const x of t) { bw += wOf(x); VOCAB.add(x); }
      return { s, t, bw, neg: t.some((x) => NEGW.has(x)) };
    });
  }
  prepped = true;
}
const NEGW = new Set(["not", "never", "no", "stop", "off", "without", "nope", "nah"]);
function dl(a, b, lim) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > lim) return lim + 1;
  let p2 = null, p1 = new Array(lb + 1), c = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) p1[j] = j;
  for (let i = 1; i <= la; i++) {
    c[0] = i;
    let rowMin = c[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(p1[j] + 1, c[j - 1] + 1, p1[j - 1] + cost);
      if (p2 && i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) v = Math.min(v, p2[j - 2] + 1);
      c[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > lim) return lim + 1;
    p2 = p1; p1 = c; c = new Array(lb + 1);
  }
  return p1[lb];
}
const ALPHA = /^[a-z]+$/;
function tmatch(p, t) {
  const lp = p.length;
  if (lp < 4 || t.length < 4 || lp > 20 || t.length > 20) return false;
  const lim = lp <= 6 ? 1 : 2;
  if (Math.abs(lp - t.length) > lim) return false;
  if (lp === 4) { if (p[0] !== t[0]) return false; if (t.length === 4 ? p.split("").sort().join("") !== t.split("").sort().join("") : p[3] !== t[t.length - 1] && p[3] !== t[3]) return false; }
  if (!ALPHA.test(p) || !ALPHA.test(t)) return false;
  return dl(p, t, lim) <= lim;
}
// fz[j] is true when token j is unknown to the KB, so only real typos get fuzzy-matched (stops "more" matching "morse")
function scorePat(P, toks, iw, totalW, norm, fzok) {
  if (P.s === norm) return 300 + P.bw;
  const n = toks.length, pt = P.t, m = pt.length;
  if (m > n) return 0;
  let pos = 0, fz = 0, contig = true, prev = -1, mw = 0, ok = true, pen = 0;
  for (let a = 0; a < m; a++) {
    const p = pt[a];
    let f = -1, k = 0;
    for (let j = pos; j < n; j++) if (toks[j] === p) { f = j; k = 1; break; }
    if (f < 0) for (let j = pos; j < n; j++) if (fzok[j] && tmatch(p, toks[j])) { f = j; k = 2; break; }
    if (f < 0) { ok = false; break; }
    if (k === 2) fz++;
    if (prev >= 0 && f !== prev + 1) contig = false;
    prev = f; pos = f + 1; mw += iw[f];
  }
  if (!ok) {
    const used = new Array(n).fill(false);
    fz = 0; mw = 0; contig = false; pen = 6;
    for (let a = 0; a < m; a++) {
      const p = pt[a];
      let f = -1, k = 0;
      for (let j = 0; j < n; j++) if (!used[j] && toks[j] === p) { f = j; k = 1; break; }
      if (f < 0) for (let j = 0; j < n; j++) if (!used[j] && fzok[j] && tmatch(p, toks[j])) { f = j; k = 2; break; }
      if (f < 0) return 0;
      used[f] = true; if (k === 2) fz++; mw += iw[f];
    }
  }
  if (m === n && fz === m && n === 1) return (P.bw - 3) + 25;
  let sc = (P.bw + (contig && m > 1 ? 8 : 0) - 3 * fz - pen) * (0.55 + 0.45 * (mw / totalW));
  if (mw >= totalW - 0.001) sc += 25;
  return sc;
}

const lastPick = new Map();
function pick(key, arr) {
  if (!arr || !arr.length) return "";
  if (arr.length === 1) return arr[0];
  let i = Math.floor(Math.random() * arr.length), tries = 0;
  while (i === lastPick.get(key) && tries++ < 30) i = Math.floor(Math.random() * arr.length);
  lastPick.set(key, i);
  return arr[i];
}
function clip(s) { return s.length <= 160 ? s : s.slice(0, 157).replace(/\s+\S*$/, "") + "..."; }

function serveFact(it) {
  let pool = FACTS.filter((f) => f.verified === true && /http/.test(f.source));
  if (it.topic) { const q = pool.filter((f) => f.topic === it.topic); if (q.length) pool = q; }
  if (it.has) { const q = pool.filter((f) => it.has.some((h) => f.text.toLowerCase().includes(h))); if (q.length) pool = q; }
  const f = pool.length > 1 ? pick("fact:" + (it.topic || (it.has && it.has[0]) || "any"), pool) : pool[0];
  const lead = pick("lead:fact", it.replies);
  return clip(lead + " " + f.text);
}

export function flavor(roomId) {
  const r = ROOMS[roomId] || ROOMS.hub;
  return pick("flavor:" + roomId, r.flavor);
}

// tiny conversation memory: last kind of thing served, and whether Bolt just offered something
const mem = { kind: null, factIt: null, offer: null, n: 0 };
const ACTED = new Set(["hint", "answer", "joke", "fact", "lobby", "repeat", "mode-chair", "mode-recliner", "mode-table", "recenter", "read-on", "music-on"]);
function negated(toks, P) {
  if (P.neg) return false;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === "never" || t === "without") return true;
    if (t === "not" && i > 0 && /^(do|does|did|please)$/.test(toks[i - 1]) && /^(tell|give|say|show|spoil|play|read|want|need|start|go|take|leave|turn|put|send|open|switch|use|change|reveal)$/.test(toks[i + 1] || "")) return true;
    if (t === "not" && /^(now|yet|today)$/.test(toks[i + 1] || "")) return true;
    if (t === "stop" && i < toks.length - 1) return true;
    if (t === "no" && i < toks.length - 1 && (i > 0 || /^(more|hint|hints|answer|answers|spoilers|spoiler|joke|jokes|fact|facts|music|reading|lobby|help|tips|tip)$/.test(toks[i + 1]))) return true;
  }
  return false;
}

export function reply(text, ctx) {
  let out;
  try {
    prep();
    ctx = ctx && typeof ctx === "object" ? ctx : {};
    out = route(text, ctx);
  } catch (e) {
    out = mk("error", "Beep! My circuits hiccuped. Say 'help' for a tip!", null);
  }
  remember(out);
  return out;
}
function remember(out) {
  const a = out.action;
  if (a === "joke") mem.kind = "joke";
  else if (a === "fact") mem.kind = "fact";
  else if (a === "hint" || a === "answer") mem.kind = "hint";
  else if (out.intent !== "follow" && out.intent !== "laugh" && out.intent !== "wow" && out.intent !== "thanks") mem.kind = null;
  if (a === "hint" || a === "answer") mem.offer = null;
  else if (/want (a|another) (little )?(tip|hint)/i.test(out.text)) mem.offer = "hint";
  else if (/want a joke/i.test(out.text)) mem.offer = "joke";
  else if (out.intent !== "follow") mem.offer = null;
}
function room(ctx) { return Object.prototype.hasOwnProperty.call(ROOMS, ctx.roomId) ? ctx.roomId : null; }

function route(text, ctx) {
  const norm = normalize(text);
  if (!norm) return mk("fallback", pick("fallback", FALLBACKS), null);
  const padded = " " + norm + " ";
  for (const s of SAFE) if (s && padded.indexOf(" " + s + " ") >= 0) return mk("safety", pick("safety", BY.get("safety").replies), null);
  const toks = norm.split(" ", 40);
  for (const t of toks) if (PROF.has(t)) return mk("profanity", pick("profanity", BY.get("profanity").replies), null);
  const rid = room(ctx);
  const iw = toks.map(wOf);
  const fzok = toks.map((t) => !VOCAB.has(t));
  let totalW = 0;
  for (const w of iw) totalW += w;
  if (totalW <= 0) totalW = 1;
  let best = null, bestS = 0, bestP = null;
  for (const it of D) {
    if (!it.pr) continue;
    let b = 0, bp = null;
    for (const P of it.pp) { const s = scorePat(P, toks, iw, totalW, norm, fzok); if (s > b) { b = s; bp = P; } }
    if (!b) continue;
    b *= it.pr;
    if (it.rooms && rid) b *= it.rooms.includes(rid) ? 1.1 : 0.85;
    if (b > bestS) { bestS = b; best = it; bestP = bp; }
  }
  if (!best || bestS < 14) return fallback(rid);
  // answers to an offer Bolt just made ("Want a tip?")
  if (mem.offer && (best.name === "yes" || best.name === "hint")) {
    const o = mem.offer;
    if (o === "joke") return build(BY.get("joke"), ctx);
    return mk("hint", pick("offer-yes", ["Great, here's your tip!", "You got it! Here's a nudge.", "Okay, tip coming right up!"]), "hint");
  }
  if (mem.offer && (best.name === "no" || best.name === "nevermind")) return mk("decline", pick("offer-no", ["No problem! You've got this. Say 'hint' any time.", "Okay! Going solo, I love it.", "Sure thing. I'm cheering for you!"]), null);
  // negation: "do not tell me the answer", "no more jokes", "don't play music"
  const act = best.action;
  if (bestP && (ACTED.has(act) || best.dyn === "follow" || best.dyn === "joke" || best.dyn === "fact") && negated(toks, bestP)) {
    if (act === "music-on") return mk("music-off", pick("music-off", BY.get("music-off").replies), "music-off");
    if (act === "read-on") return mk("read-off", pick("read-off", BY.get("read-off").replies), "read-off");
    if (act === "lobby") return mk("stay", pick("stay", BY.get("stay").replies), null);
    if (act === "joke" || act === "fact" || best.dyn === "follow") return mk("decline-fun", pick("decline-fun", BY.get("decline-fun").replies), null);
    if (act === "hint" || act === "answer") return mk("decline", pick("decline", BY.get("decline").replies), null);
    return mk("decline", pick("okay-no", ["Okay, I won't! Tell me what you'd like instead.", "Got it, never mind that one!"]), null);
  }
  return build(best, ctx);
}
function fallback(rid) {
  if (rid && rid !== "hub" && Math.random() < 0.4) return mk("fallback", clip(pick("fb-room", ["Hmm, I didn't get that. Try asking me about ", "Not sure about that one! Ask me about ", "Beep? Try asking about "]) + ROOMS[rid].ask + "!"), null);
  return mk("fallback", pick("fallback", FALLBACKS), null);
}
function mk(intent, text, action) { return { text, intent, action: action || null }; }
function build(it, ctx) {
  const rid = room(ctx);
  if (it.go && rid && it.go[rid]) it = BY.get(it.go[rid]) || it;
  const r = ROOMS[rid] || ROOMS.hub;
  if (it.dyn === "roomabout") return mk(it.name, r.about, null);
  if (it.dyn === "roomgoal") return mk(it.name, clip(r.goal), null);
  if (it.dyn === "roomthings") return mk(it.name, clip(r.things), null);
  if (it.dyn === "fact") { mem.factIt = it; return mk(it.name, serveFact(it), "fact"); }
  if (it.dyn === "joke") {
    const j = pick("joke", JOKES);
    const lead = pick("lead:joke", it.replies);
    return mk(it.name, clip(lead.length + j.length < 150 ? lead + " " + j : j), "joke");
  }
  if (it.dyn === "follow") {
    if (mem.kind === "joke") return build(BY.get("joke"), ctx);
    if (mem.kind === "fact") return build(mem.factIt || BY.get("fact-any"), ctx);
    if (mem.kind === "hint") return mk("more-detail", pick("more-detail", BY.get("more-detail").replies), "hint");
    return mk("repeat", pick("repeat", BY.get("repeat").replies), "repeat");
  }
  if (it.name === "solved-it" && ctx.playerSolved === true) return mk(it.name, pick("solved-yes", ["Yes, you did it! Awesome work!", "You solved it! Great thinking!", "Woohoo! That big brain of yours did it!"]), null);
  if (it.room && rid && it.room[rid]) return mk(it.name, pick(it.name + ":" + rid, it.room[rid]), it.action || null);
  if (it.rooms && rid && !it.rooms.includes(rid) && it.away) return mk(it.name, pick(it.name + ":away", it.away), it.action || null);
  return mk(it.name, pick(it.name, it.replies), it.action || null);
}
