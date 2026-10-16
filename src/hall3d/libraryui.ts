/** Bound books for the upstairs library. The words are written for this school from free knowledge
 *  (school facts and the public-domain Gettysburg Address). Nothing here is copied from a textbook. */
export interface ShelfBook { id: string; title: string; author: string; grades: string; cloth: string; pages: { heading: string; body: string }[] }

export const SHELF: ShelfBook[] = [
  { id: "count", title: "Counting the Day", author: "Pixunisim Library", grades: "K–2", cloth: "#C46B4A", pages: [
    { heading: "Morning count", body: "Before school starts, Maya counts what she can see. One backpack. Two shoes. Three books in the bag. Four friends at the door. Five windows letting the light in.\n\nCounting is giving each thing one number, in order, and not skipping. The last number you say is how many there are." },
    { heading: "Adding on the way", body: "Two students are already at the table. Three more sit down. Maya does not start over from one. She starts at two and counts on: three, four, five.\n\nTwo and three make five. You can check by lining the people up and counting them all." },
    { heading: "Taking some away", body: "There were six crayons. Leo takes two to the art shelf. Six take away two leaves four. Maya holds up six fingers and folds two down to see the four that are left.\n\nIf you put the two crayons back, you have six again. Adding and taking away undo each other." },
    { heading: "Try it", body: "Count the doors you pass on the way to lunch. Then count the windows. Which number is bigger?\n\nDraw five circles. Color two of them. How many are still plain? Say the sentence out loud: five take away two is three." },
  ] },
  { id: "story", title: "How a Story Works", author: "Pixunisim Library", grades: "K–5", cloth: "#6E8B74", pages: [
    { heading: "Somebody wants something", body: "A story needs a person, an animal, or even a school that wants something. The want is the engine. If nobody wants anything, the pages just sit there.\n\nIn a good short story you can say the want in one line: the new student wants a friend before lunch." },
    { heading: "Trouble", body: "The want runs into trouble. The friend is in another class. The bell rings. Someone is unkind. Trouble is not there to be mean to the reader. It is there so the person has to try.\n\nEach try can fail once. That is how we learn what the person is like." },
    { heading: "The turn", body: "Near the end, something changes. The student asks instead of waiting. Or they notice the quiet kid by the fountain wanted a friend too.\n\nThe ending should answer the want. They get it, they get part of it, or they choose a better want. The reader should be able to say what changed." },
    { heading: "Your turn", body: "Write four lines. Line one: who it is. Line two: what they want. Line three: what gets in the way. Line four: how it turns.\n\nRead it to someone. If they can retell it, the story is working." },
  ] },
  { id: "weather", title: "Weather You Can See", author: "Pixunisim Library", grades: "3–5", cloth: "#4F91C7", pages: [
    { heading: "Air has weight", body: "Air is not empty. A tall stack of air sits on the school all day. That stack is air pressure. When the stack is heavy, the day is often clear. When a lighter stack moves in, clouds have an easier time growing.\n\nYou cannot see the stack, but you can see what it does to the flag and the trees." },
    { heading: "Water in the air", body: "Puddles disappear because the water becomes vapor, a gas you cannot see. When that vapor cools, it turns back into tiny drops. A cloud is those drops, or ice, held up by rising air.\n\nRain is the drops growing heavy enough to fall. Snow is the same water, frozen on the way down." },
    { heading: "Why the wind blows", body: "Air moves from where the stack is heavier toward where it is lighter. That movement is wind. The sun heats land and water differently, so the stacks are always changing.\n\nA sea breeze in the afternoon is the cooler air over the water sliding in to replace warm air that rose over the land." },
    { heading: "Read the sky", body: "High, thin clouds can mean a change is a day away. A dark, tall cloud means rain may be close. A sudden cool wind before the cloud arrives is the storm's own air pushing out ahead of it.\n\nWrite three lines in a notebook: what the sky looks like, which way the wind moves, and what you think will happen in an hour. Then check." },
  ] },
  { id: "fractions", title: "Fractions at the Table", author: "Pixunisim Library", grades: "3–5", cloth: "#E0B15A", pages: [
    { heading: "Fair shares", body: "One pizza, four people, equal pieces. Each person gets one fourth. The bottom number, the denominator, says how many equal pieces the whole was cut into. The top number, the numerator, says how many of those pieces you have.\n\nOne fourth is written 1/4. Two of those pieces is 2/4, which is the same amount as one half." },
    { heading: "Same amount, different name", body: "Fold a paper strip in half and shade one side. That is 1/2. Fold it in half again. The shaded part is now two of four small pieces, 2/4. The shaded amount did not grow. The name changed.\n\n1/2 and 2/4 are equivalent fractions. You can multiply the top and the bottom by the same number and the amount stays the same." },
    { heading: "Adding pieces", body: "If the pieces are the same size, add the tops and keep the bottom. One fourth of an apple plus two fourths is three fourths.\n\nYou cannot add one half and one third by adding the tops and the bottoms. Cut both so the pieces match. Halves and thirds both fit into sixths: 1/2 is 3/6 and 1/3 is 2/6. Together that is 5/6." },
    { heading: "Of a number", body: "One fourth of eight is two, because eight splits into four equal groups of two. A fourth of a number is that number divided by four.\n\nTry 1/3 of 12, and 3/4 of 12. Draw the groups if the numbers feel slippery." },
  ] },
  { id: "cell", title: "A Cell Is a City", author: "Pixunisim Library", grades: "6–8", cloth: "#3F7655", pages: [
    { heading: "The smallest living room", body: "Every living thing you can name is made of cells. A cell is a small room with a job. It takes in food or light, it builds what it needs, and it gets rid of waste. A bacterium is one cell. You are made of trillions, each one specialized." },
    { heading: "The wall and the gate", body: "A cell membrane is the city wall. It is not a solid brick wall. It chooses what may come in and what must leave. Oxygen and water pass. Many large molecules need a gate, a protein, to get through.\n\nPlant cells also have a stiff cell wall outside the membrane, which is why a leaf holds its shape." },
    { heading: "The offices", body: "The nucleus holds the instructions, DNA, written in a chemical alphabet. Ribosomes read copies of those instructions and build proteins. Mitochondria release energy from food. In a plant cell, chloroplasts catch sunlight and make sugar.\n\nNone of these parts works alone. The cell is the whole city running at once." },
    { heading: "A question to keep", body: "If a cell's membrane started letting everything in, what would happen to the inside? Write three sentences. Use the words membrane, nucleus, and energy.\n\nThen look at one living thing near you and name one job its cells must be doing right now." },
  ] },
  { id: "gettysburg", title: "A Speech Worth Reading Slowly", author: "Abraham Lincoln, with notes for this school", grades: "6–12", cloth: "#8E5A3C", pages: [
    { heading: "Why this page is here", body: "The words on the next page are the Gettysburg Address. Abraham Lincoln spoke them on November 19, 1863, at a cemetery for soldiers killed in the Battle of Gettysburg. The speech is in the public domain, so a school may print it. The notes around it were written for Pixunisim. They are not part of the speech.\n\nRead the speech once without stopping. Then read the notes." },
    { heading: "The address", body: "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.\n\nNow we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.\n\nBut, in a larger sense, we can not dedicate — we can not consecrate — we can not hallow — this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us — that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion — that we here highly resolve that these dead shall not have died in vain — that this nation, under God, shall have a new birth of freedom — and that government of the people, by the people, for the people, shall not perish from the earth." },
    { heading: "What he is doing", body: "Four score and seven is 87. He is pointing back to 1776, not to the Constitution of 1787. The proposition he names is equality.\n\nHe says the living cannot make the ground holy. The dead already did that by what they did. Then he turns the job onto the living: finish the work, so the deaths were not for nothing.\n\nThe last line is a definition of the government he wants to keep. Of the people means it belongs to them. By the people means they run it. For the people means it has to serve them." },
    { heading: "Read it as a writer", body: "The speech is short on purpose. A longer speech came before his that day, and almost nobody quotes it.\n\nMark one sentence you think is the turn, where he stops talking about the ground and starts talking about the living. Then write two sentences of your own about a promise your school should keep. Do not copy his wording. Steal the shape: name the promise, name the test, name the work that is still unfinished." },
  ] },
  { id: "algebra", title: "Seeing Algebra", author: "Pixunisim Library", grades: "8–12", cloth: "#4F91C7", pages: [
    { heading: "A letter is a number you do not know yet", body: "x is not a secret code. It is a box with a number in it. If x + 3 = 10, the box holds 7, because 7 is the only number that makes the sentence true.\n\nAn equation is a sentence that says two amounts are the same. Whatever you do to one side, you do to the other, or the sentence becomes a lie." },
    { heading: "Keeping it fair", body: "Start with x + 3 = 10. Subtract 3 from both sides. x = 7. You can check by putting 7 back: 7 + 3 is 10. The check is part of the work, not a decoration.\n\nIf 2x = 10, divide both sides by 2. x = 5. Multiplying both sides by 2 would make 4x = 20, which is still true, but it does not yet tell you the number in the box." },
    { heading: "A line is a rule", body: "y = 2x + 1 says: take the number you put in, double it, and add one. If x is 0, y is 1. If x is 1, y is 3. If x is 2, y is 5. The points (0, 1), (1, 3), and (2, 5) sit on one straight line.\n\nThe 2 is the slope, how much y climbs when x grows by 1. The 1 is where the line crosses the y-axis, the intercept." },
    { heading: "A problem with a picture", body: "A reading table seats 2 people, plus 1 chair at the end for a librarian. The rule is y = 2x + 1 if x is the number of tables pushed together in a row and the end chair is shared.\n\nHow many seats is 4 tables? Put 4 in for x. Then ask the backward question: if there are 11 seats, how many tables? Write 11 = 2x + 1 and undo the steps." },
  ] },
  { id: "facts", title: "How to Check a Fact", author: "The Newsroom", grades: "6–12", cloth: "#E07A66", pages: [
    { heading: "A claim is not a fact yet", body: "A claim is a sentence somebody wants you to believe. A fact is a claim that holds up when you check it. The newsroom's job is to slow down between those two.\n\nBefore you repeat a sentence, ask: who said it, how would they know, and what would prove them wrong?" },
    { heading: "Two kinds of source", body: "A primary source was there. A letter from the day, a photo of the event, the data a lab wrote down, a law as it was passed. A secondary source is someone later explaining those things. A textbook is usually secondary. The Gettysburg Address in the library is primary. A chapter about the speech is secondary.\n\nBoth can be useful. They are not the same kind of evidence." },
    { heading: "Three checks", body: "First, can you find the same claim in a second place that did not copy the first place? Second, does the number have a date? A true number from 1998 can be a false picture of today. Third, does the headline say more than the story? If the story says 'may' and the headline says 'will', the headline is doing extra work the facts did not earn." },
    { heading: "Write it so a reader can check you", body: "A clear news sentence names the source. 'The principal said the play is Friday' is checkable. 'Everyone knows the play is Friday' is not.\n\nPick one sign in the hallway. Write what it claims, where you saw it, and one way a new student could check it without asking you. That is a newsroom habit." },
  ] },
];

const css = () => {
  if (document.getElementById("libcss")) return;
  const s = document.createElement("style"); s.id = "libcss";
  s.textContent = `#libHost{position:absolute;inset:0;z-index:80;display:none;background:rgba(47,36,32,.45);touch-action:auto;user-select:text}
#libHost.show{display:flex;align-items:center;justify-content:center;padding:12px}
.libroom{width:min(920px,100%);max-height:min(92vh,760px);background:#F6EFE2;border-radius:18px;box-shadow:0 18px 40px rgba(40,24,16,.35);display:flex;flex-direction:column;overflow:hidden;color:#3A2C28;font-family:Georgia,"Iowan Old Style",serif}
.libtop{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;background:#6E8B74;color:#FBF6EE;font-family:"Fredoka","Trebuchet MS",sans-serif}
.libtop b{font-weight:600}
.libtop button,.libnav button{font:inherit;font-family:"Fredoka","Trebuchet MS",sans-serif;background:#FBF6EE;color:#3A2C28;border:0;border-radius:10px;padding:8px 12px;min-height:36px;cursor:pointer}
.libnote{margin:0;padding:8px 14px 0;font-size:13px;color:#6d5a52;font-family:"Fredoka","Trebuchet MS",sans-serif}
.libshelf{display:flex;gap:10px;overflow:auto;padding:12px 14px 16px}
.libcover{flex:none;width:132px;min-height:176px;border-radius:4px 10px 10px 4px;color:#FBF6EE;padding:12px 10px 12px 14px;box-shadow:inset 8px 0 0 rgba(0,0,0,.18),4px 6px 0 rgba(80,50,40,.2);cursor:pointer;text-align:left;border:0;display:flex;flex-direction:column;justify-content:space-between}
.libcover b{font-size:16px;line-height:1.2}
.libcover small{font-family:"Fredoka","Trebuchet MS",sans-serif;opacity:.9}
.libbook{display:flex;flex-direction:column;gap:8px;padding:8px 14px 14px;min-height:0;flex:1}
.libspread{flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:280px;background:linear-gradient(90deg,#fffaf2 0%,#fffaf2 48%,#e7d3b4 50%,#fffaf2 52%,#fffaf2 100%);border-radius:6px 12px 12px 6px;box-shadow:0 8px 0 #c4a574,0 14px 24px rgba(80,50,40,.18);overflow:auto}
.libpage{padding:16px 18px 20px;font-size:16px;line-height:1.45}
.libpage h3{font-size:18px;margin:0 0 8px}
.libpage p{margin:0 0 8px}
.libnav{display:flex;justify-content:space-between;align-items:center;font-family:"Fredoka","Trebuchet MS",sans-serif;font-size:14px}
@media(max-width:700px){.libspread{grid-template-columns:1fr}.libpage.left{border-bottom:1px solid #e7d3b4}}`;
  document.head.appendChild(s);
};

export function openLibrary(host: HTMLElement, onClose: () => void) {
  css(); host.classList.add("show"); host.innerHTML = "";
  const room = document.createElement("div"); room.className = "libroom"; host.appendChild(room);
  const top = document.createElement("div"); top.className = "libtop"; room.appendChild(top);
  const title = document.createElement("b"); title.textContent = "School library"; top.appendChild(title);
  const close = document.createElement("button"); close.textContent = "Close"; top.appendChild(close);
  const shut = () => { host.classList.remove("show"); host.innerHTML = ""; onClose(); };
  close.onclick = shut;
  const note = document.createElement("p"); note.className = "libnote"; note.textContent = "These books were written for this school from free knowledge. The Gettysburg Address is a public-domain speech. The rest is ours, so you can read it here."; room.appendChild(note);
  const shelf = document.createElement("div"); shelf.className = "libshelf"; room.appendChild(shelf);
  const reader = document.createElement("div"); reader.className = "libbook"; reader.hidden = true; room.appendChild(reader);
  let book: ShelfBook | null = null, page = 0;
  const paintShelf = () => {
    shelf.hidden = false; reader.hidden = true; title.textContent = "School library"; shelf.innerHTML = "";
    for (const b of SHELF) {
      const c = document.createElement("button"); c.className = "libcover"; c.style.background = b.cloth;
      c.innerHTML = `<b></b><small></small>`; c.querySelector("b")!.textContent = b.title; c.querySelector("small")!.textContent = `${b.grades} · ${b.pages.length} pages`;
      c.onclick = () => { book = b; page = 0; paintBook(); }; shelf.appendChild(c);
    }
  };
  const paintBook = () => {
    if (!book) return; shelf.hidden = true; reader.hidden = false; title.textContent = book.title; reader.innerHTML = "";
    const spread = document.createElement("div"); spread.className = "libspread";
    const left = book.pages[page], right = book.pages[page + 1];
    const side = (p: ShelfBook["pages"][number] | undefined, cls: string) => {
      const d = document.createElement("div"); d.className = "libpage " + cls;
      if (!p) { d.innerHTML = "<p>The end of this book. Close it, or turn back.</p>"; spread.appendChild(d); return; }
      const h = document.createElement("h3"); h.textContent = p.heading; d.appendChild(h);
      for (const para of p.body.split("\n\n")) { const el = document.createElement("p"); el.textContent = para; d.appendChild(el); }
      spread.appendChild(d);
    };
    side(left, "left"); side(right, "right"); reader.appendChild(spread);
    const nav = document.createElement("div"); nav.className = "libnav";
    const prev = document.createElement("button"); prev.textContent = "Previous pages"; prev.disabled = page <= 0; prev.onclick = () => { page = Math.max(0, page - 2); paintBook(); };
    const label = document.createElement("span"); label.textContent = `${book.author} · pages ${page + 1}–${Math.min(book.pages.length, page + 2)} of ${book.pages.length}`;
    const next = document.createElement("button"); next.textContent = "Next pages"; next.disabled = page + 2 >= book.pages.length; next.onclick = () => { page += 2; paintBook(); };
    const back = document.createElement("button"); back.textContent = "All books"; back.onclick = paintShelf;
    nav.append(prev, label, next, back); reader.appendChild(nav);
  };
  paintShelf();
}
