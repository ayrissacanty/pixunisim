
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1), 'Student'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- curriculum
CREATE TABLE public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE public.lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE TABLE public.questions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('practice','check')),
  prompt TEXT NOT NULL,
  choices JSONB NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.courses, public.lessons, public.questions TO anon, authenticated;
GRANT ALL ON public.courses, public.lessons, public.questions TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read courses" ON public.courses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read lessons" ON public.lessons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read questions" ON public.questions FOR SELECT TO anon, authenticated USING (true);

-- campus
CREATE TABLE public.campus_zones (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE public.campus_buildings (
  id TEXT PRIMARY KEY, zone_id TEXT NOT NULL REFERENCES public.campus_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT NOT NULL, departments JSONB NOT NULL DEFAULT '[]'::jsonb,
  map_x INT NOT NULL DEFAULT 0, map_y INT NOT NULL DEFAULT 0
);
CREATE TABLE public.campus_rooms (
  id TEXT PRIMARY KEY, building_id TEXT NOT NULL REFERENCES public.campus_buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'classroom',
  course_id TEXT REFERENCES public.courses(id), lesson_id TEXT REFERENCES public.lessons(id),
  sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE public.campus_npcs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, zone_id TEXT, room_id TEXT,
  greeting TEXT NOT NULL, behavior TEXT NOT NULL DEFAULT 'idle'
);
GRANT SELECT ON public.campus_zones, public.campus_buildings, public.campus_rooms, public.campus_npcs TO anon, authenticated;
GRANT ALL ON public.campus_zones, public.campus_buildings, public.campus_rooms, public.campus_npcs TO service_role;
ALTER TABLE public.campus_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_npcs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read zones" ON public.campus_zones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read buildings" ON public.campus_buildings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read rooms" ON public.campus_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read npcs" ON public.campus_npcs FOR SELECT TO anon, authenticated USING (true);

-- student state
CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id TEXT NOT NULL, lesson_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  score INT, sections_read INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
CREATE TABLE public.student_campus_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  location_id TEXT NOT NULL, discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, location_id)
);
CREATE TABLE public.campus_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  objective_key TEXT NOT NULL, completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ, UNIQUE (user_id, objective_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_progress, public.student_campus_discoveries, public.campus_objectives TO authenticated;
GRANT ALL ON public.student_progress, public.student_campus_discoveries, public.campus_objectives TO service_role;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_campus_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON public.student_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own discoveries" ON public.student_campus_discoveries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own objectives" ON public.campus_objectives FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ================= SEED: COURSES =================
INSERT INTO public.courses (id, title, subject, description, sort_order) VALUES
('foundations-algebra','Foundations of Algebra','Mathematics','Build fluency with variables, expressions, order of operations, and solving equations.',1),
('world-civilizations','World Civilizations','History','Trace how human societies became civilizations, from river valleys to ancient Egypt.',2),
('intro-life-science','Introduction to Life Science','Science','Explore what makes something alive, the cell, and how living things depend on one another.',3);

INSERT INTO public.lessons (id, course_id, title, summary, sort_order, sections) VALUES
('algebra-lesson-1','foundations-algebra','Variables and Expressions','Learn how letters stand in for unknown numbers and how to read and build algebraic expressions.',1,
 '[{"heading":"Why we use variables","type":"concept","body":"A variable is a letter that stands for a number we do not know yet, or a number that can change. If a bus holds 40 riders and you do not know how many buses are coming, you can write 40b, where b is the number of buses. The letter is not a mystery; it is a placeholder that lets you describe a whole family of situations with one short statement. Mathematicians use variables because a rule written once with a letter is worth writing a hundred separate arithmetic problems."},
  {"heading":"Parts of an expression","type":"concept","body":"An algebraic expression is a combination of numbers, variables, and operations, with no equals sign. In the expression 5x + 3, the 5 is the coefficient (the number multiplying the variable), x is the variable, and 3 is a constant (a number that never changes). The pieces separated by plus or minus signs are called terms, so 5x + 3 has two terms. Notice there is no equals sign: an expression is a value, not a claim."},
  {"heading":"Worked example","type":"example","body":"Translate: seven more than triple a number. Triple a number is 3n. Seven more than that is 3n + 7. Now evaluate the expression when n = 4. Substitute: 3(4) + 7 = 12 + 7 = 19. Evaluating means replacing every variable with a given value and simplifying to a single number."},
  {"heading":"Second worked example","type":"example","body":"A phone plan costs $15 per month plus $0.10 per gigabyte of data. Write an expression for the monthly cost when g gigabytes are used: 15 + 0.10g. If you use 30 gigabytes, the cost is 15 + 0.10(30) = 15 + 3 = $18. The same expression works for any amount of data, which is exactly the power of a variable."},
  {"heading":"Try it yourself","type":"activity","body":"Write an expression for each phrase, then evaluate it at the given value. (1) Four less than twice a number, at n = 10. (2) The number of hours in d days, at d = 5. (3) A rectangle whose width is w and whose length is three more than the width: write its perimeter, then evaluate at w = 6. Check: (1) 2n - 4 = 16, (2) 24d = 120, (3) 2w + 2(w + 3) = 4w + 6 = 30."}]'::jsonb),

('algebra-lesson-2','foundations-algebra','Order of Operations','Use a consistent order to evaluate expressions so everyone gets the same answer.',2,
 '[{"heading":"Why order matters","type":"concept","body":"Consider 2 + 3 x 4. If you add first you get 20; if you multiply first you get 14. Mathematics cannot tolerate two answers for one expression, so the world agreed on a fixed order: grouping symbols first, then exponents, then multiplication and division left to right, then addition and subtraction left to right. The correct value is 14."},
  {"heading":"The full order","type":"concept","body":"1. Parentheses and other grouping symbols, including the bar of a fraction and the inside of a square root. 2. Exponents. 3. Multiplication and division, worked left to right as equals, not multiplication before division. 4. Addition and subtraction, also left to right. The common memory aid PEMDAS is useful, but it misleads students into thinking multiplication always comes before division. In 12 / 3 x 2 the answer is 8, not 2."},
  {"heading":"Worked example","type":"example","body":"Evaluate 4 + 2(9 - 5)^2 / 8. Inside parentheses: 9 - 5 = 4, giving 4 + 2(4)^2 / 8. Exponent: 4^2 = 16, giving 4 + 2(16) / 8. Multiplication and division left to right: 2 x 16 = 32, then 32 / 8 = 4. Finally addition: 4 + 4 = 8."},
  {"heading":"A trap to avoid","type":"example","body":"Evaluate 10 - 2 - 3. Working left to right gives (10 - 2) - 3 = 5. A student who subtracts 2 - 3 first gets 11, which is wrong. Subtraction and division are not commutative, so the left-to-right rule is doing real work, not just bookkeeping."},
  {"heading":"Try it yourself","type":"activity","body":"Evaluate each expression. (1) 6 + 4 x 5. (2) (6 + 4) x 5. (3) 3 x 2^3 - 10 / 5. (4) 20 / 4 x 5. Check: 26, 50, 22, 25. If you got 1 for the last one, you multiplied before dividing instead of moving left to right."}]'::jsonb),

('algebra-lesson-3','foundations-algebra','One-Step Equations','Solve equations by undoing operations while keeping both sides balanced.',3,
 '[{"heading":"An equation is a balance","type":"concept","body":"An equation says two expressions have the same value. Picture a balance scale: whatever you do to one pan you must do to the other, or the scale tips. Solving means isolating the variable on one side, so the equation ends up reading x = some number. Every legal move is a move applied to both sides."},
  {"heading":"Inverse operations","type":"concept","body":"Each operation has an inverse that undoes it: addition and subtraction undo each other, and multiplication and division undo each other. To solve x + 7 = 12 you subtract 7 from both sides, because subtraction undoes the addition attached to x. To solve 4x = 20 you divide both sides by 4."},
  {"heading":"Worked examples","type":"example","body":"Solve x + 7 = 12. Subtract 7 from both sides: x + 7 - 7 = 12 - 7, so x = 5. Solve x / 3 = 6. Multiply both sides by 3: x = 18. Solve 4x = 20. Divide both sides by 4: x = 5. Solve n - 9 = -2. Add 9 to both sides: n = 7."},
  {"heading":"Always check","type":"example","body":"Checking is one substitution and it catches nearly every arithmetic slip. For x = 5 in 4x = 20: 4(5) = 20, true. For n = 7 in n - 9 = -2: 7 - 9 = -2, true. If the check fails, the error is in your solving steps, not in the original problem."},
  {"heading":"Try it yourself","type":"activity","body":"Solve and check each equation. (1) y - 4 = 11. (2) 6m = 42. (3) t / 5 = 9. (4) 8 + k = 3. Check: y = 15, m = 7, t = 45, k = -5."}]'::jsonb),

('history-lesson-1','world-civilizations','What Is Civilization?','Identify the features historians use to tell a civilization from other kinds of society.',1,
 '[{"heading":"From villages to cities","type":"concept","body":"For most of human history, people lived in small mobile groups that hunted and gathered. Roughly twelve thousand years ago, some communities began farming. Farming tied people to land, produced storable surplus food, and allowed populations to grow far denser than foraging ever could. Cities grew where that surplus was largest, and with cities came a new form of society historians call civilization."},
  {"heading":"The usual features","type":"concept","body":"Historians commonly look for several features: cities as centers of population and trade; an organized government able to collect taxes and enforce law; a complex religion with priests and shared temples; job specialization, so that a person can be a potter or scribe rather than a farmer; social classes; some form of record keeping or writing; and public works such as walls, canals, and temples. No single feature makes a civilization, and the list is a tool for comparison rather than a test to pass."},
  {"heading":"Surplus is the engine","type":"example","body":"Consider a farming village that produces exactly enough grain to feed itself. Everyone must farm. Now imagine irrigation doubles the harvest. Half the community can stop farming and instead weave, build, keep accounts, or serve as soldiers. Specialization, taxes, and rulers all trace back to that stored surplus, which is why early civilizations cluster along rivers with reliable water."},
  {"heading":"Careful with the word","type":"concept","body":"Civilization is a descriptive term, not a compliment. Nomadic and non-urban peoples built rich cultures, sophisticated technologies, law, art, and trade networks. Calling a society a civilization tells you about its scale and organization, not its worth. Good historians use the word precisely and avoid the old habit of ranking peoples by it."},
  {"heading":"Try it yourself","type":"activity","body":"Pick your own town or city and identify at least four of the features listed above in it. Then describe one job in your community that exists only because other people grow the food. Finally, name one public work near you and explain who paid for it and who benefits."}]'::jsonb),

('history-lesson-2','world-civilizations','Ancient River Valley Civilizations','Compare the first civilizations that grew along great rivers.',2,
 '[{"heading":"Why rivers","type":"concept","body":"The earliest civilizations appeared in river valleys: the Tigris and Euphrates in Mesopotamia, the Nile in Egypt, the Indus in South Asia, and the Huang He (Yellow River) in China. Rivers supplied drinking water, fish, transport, and above all silt: fine flood-deposited soil that renewed farmland every year. Rivers also demanded cooperation, because canals and flood defenses take more hands than one family has."},
  {"heading":"Mesopotamia","type":"example","body":"In the land between the rivers, Sumerian city-states such as Ur and Uruk arose by about 3500 BCE. Sumerians developed cuneiform, wedge-shaped marks pressed into clay, first for counting grain and livestock and only later for stories and law. They built stepped temples called ziggurats. Their floods were violent and unpredictable, which shows in a literature full of anxious, demanding gods."},
  {"heading":"Indus and Huang He","type":"example","body":"The Indus Valley cities of Harappa and Mohenjo-Daro, flourishing around 2600 BCE, were remarkable for planning: grid streets, standardized fired bricks, covered drains, and public baths, with little sign of palaces or grand tombs. Their script is still undeciphered. Along the Huang He, farmers worked fertile wind-blown loess soil, and under the Shang dynasty rulers consulted oracle bones whose inscriptions are the earliest surviving Chinese writing."},
  {"heading":"Common patterns","type":"concept","body":"Across all four, the same pattern repeats: irrigation raises surplus, surplus supports specialists, specialists require record keeping, record keeping strengthens rulers, and rulers organize larger public works that raise surplus again. Differences matter too. Egypt was unified early and sheltered by desert, while Mesopotamia stayed a patchwork of rival city-states on an open plain, and that geography shaped very different politics."},
  {"heading":"Try it yourself","type":"activity","body":"Make a four-column chart for Mesopotamia, Egypt, the Indus Valley, and the Huang He. For each, record the river, an approximate start date, one form of writing or record keeping, and one distinctive achievement. Then write two sentences answering: which two are most alike, and why?"}]'::jsonb),

('history-lesson-3','world-civilizations','Ancient Egypt','Study how the Nile shaped one of the longest-lasting civilizations on record.',3,
 '[{"heading":"The gift of the Nile","type":"concept","body":"The Greek historian Herodotus called Egypt the gift of the Nile, and the phrase is close to literal. The Nile flooded on a predictable schedule each summer, leaving black silt that made narrow bands along the banks extraordinarily fertile. Egyptians called their land Kemet, the black land, and the surrounding desert Deshret, the red land. Deserts on both sides discouraged invasion, so Egyptian culture developed with unusual continuity."},
  {"heading":"Government and religion","type":"concept","body":"Egypt was ruled by a pharaoh who was understood to be both king and a living link to the gods, responsible for maat: order, balance, and justice. A large bureaucracy of scribes measured fields, assessed taxes in grain, and directed labor. Religion centered on many gods, among them Ra the sun, Osiris the judge of the dead, and Isis, and on a detailed belief in an afterlife that required preserving the body through mummification."},
  {"heading":"Building and writing","type":"example","body":"The pyramids at Giza, built during the Old Kingdom around 2500 BCE, were royal tombs raised by organized, paid, and fed crews of Egyptian workers, not by the enslaved masses of later legend. Egyptians wrote in hieroglyphs on temple walls and in a faster cursive hand on papyrus. Because the Rosetta Stone repeated one decree in hieroglyphs, demotic, and Greek, scholars were able to recover the language in the 1820s."},
  {"heading":"The long arc","type":"concept","body":"Historians divide Egyptian history into the Old, Middle, and New Kingdoms, separated by intermediate periods of weak central rule. The New Kingdom brought empire and famous rulers such as Hatshepsut, who ruled as pharaoh and expanded trade, and Ramesses II. Egypt eventually fell under Persian, then Greek, then Roman rule, but its institutions had already lasted roughly three thousand years."},
  {"heading":"Try it yourself","type":"activity","body":"Write a short paragraph explaining how three specific features of Egyptian life, one economic, one political, and one religious, depended on the Nile. Then explain in a sentence why the predictability of the Nile flood might produce a more optimistic religion than the violent floods of Mesopotamia."}]'::jsonb),

('science-lesson-1','intro-life-science','What Is Life?','Use the characteristics of living things to distinguish life from non-life.',1,
 '[{"heading":"A surprisingly hard question","type":"concept","body":"A rock, a candle flame, and a mouse all change over time, but only one is alive. Biologists do not define life with a single property; they use a list of characteristics that living things share. Something is considered alive when it shows all of them, not just one or two."},
  {"heading":"The characteristics","type":"concept","body":"Living things are made of one or more cells; they use energy through metabolism; they maintain stable internal conditions, called homeostasis; they grow and develop; they respond to stimuli in their environment; they reproduce; and populations of them evolve over generations. Notice that some characteristics belong to individuals, such as homeostasis, while evolution belongs to populations across time."},
  {"heading":"Testing the list","type":"example","body":"A candle flame consumes fuel, gives off heat, and grows, but it has no cells, no DNA, and no homeostasis, so it is not alive. A crystal grows by adding identical units, yet it does not metabolize or respond. A virus is the genuinely hard case: it carries genetic material and evolves, but it has no cells and cannot metabolize or reproduce without hijacking a host cell, so most biologists place viruses at the border of life rather than inside it."},
  {"heading":"Levels of organization","type":"concept","body":"Life is organized in nested levels: atoms build molecules, molecules build organelles, organelles build cells, cells build tissues, tissues build organs, organs build organ systems, and organ systems build an organism. Beyond the organism come populations, communities, ecosystems, and the biosphere. Each level has properties the level below does not, which is why studying a single molecule cannot tell you everything about a mouse."},
  {"heading":"Try it yourself","type":"activity","body":"For each item, decide whether it is living, once living, or never living, and name the deciding characteristic: a seed, a wooden desk, a river, yeast in bread dough, a computer virus, and a mushroom. Then write one sentence explaining why growth alone is not enough evidence of life."}]'::jsonb),

('science-lesson-2','intro-life-science','Cells: The Building Blocks of Life','Compare cell types and learn what the main organelles do.',2,
 '[{"heading":"Cell theory","type":"concept","body":"Cell theory has three parts: all living things are made of cells, the cell is the basic unit of structure and function in living things, and all cells come from existing cells. It took roughly two centuries to assemble, beginning with Robert Hooke naming cork cells in 1665 and Anton van Leeuwenhoek observing living microorganisms shortly after."},
  {"heading":"Two kinds of cells","type":"concept","body":"Prokaryotic cells, such as bacteria, have no nucleus and no membrane-bound organelles; their DNA floats in the cytoplasm in a region called the nucleoid. Eukaryotic cells, which make up protists, fungi, plants, and animals, keep their DNA inside a nucleus and contain many specialized organelles. Prokaryotic cells are typically ten to a hundred times smaller."},
  {"heading":"What the organelles do","type":"example","body":"The cell membrane controls what enters and leaves the cell. The nucleus stores DNA and directs activity. Mitochondria release energy from food through cellular respiration and are often called the powerhouse of the cell. Ribosomes build proteins. The endoplasmic reticulum transports materials, and the Golgi apparatus packages and ships them. Lysosomes break down waste. Plant cells add a rigid cell wall, a large central vacuole for water storage, and chloroplasts that carry out photosynthesis."},
  {"heading":"Structure fits function","type":"example","body":"A red blood cell is a flexible disc with no nucleus, which maximizes room for oxygen-carrying hemoglobin and lets it squeeze through narrow capillaries. A nerve cell stretches into a long fiber to carry signals over distance. A root hair cell extends a thin projection to increase surface area for absorbing water. In biology, shape almost always follows job."},
  {"heading":"Try it yourself","type":"activity","body":"Draw a plant cell and an animal cell side by side and label at least six organelles on each. Circle the three structures found only in the plant cell. Then choose one organelle and write two sentences describing what would go wrong in the cell if it stopped working."}]'::jsonb),

('science-lesson-3','intro-life-science','Ecosystems and Interdependence','Trace energy and matter through ecosystems and explain why species depend on each other.',3,
 '[{"heading":"Parts of an ecosystem","type":"concept","body":"An ecosystem includes all the living things in an area, the biotic factors, together with the non-living conditions, the abiotic factors, such as sunlight, temperature, water, soil, and air. A population is all members of one species in an area; a community is all the populations living together; the ecosystem is the community plus its physical environment."},
  {"heading":"Energy flows one way","type":"concept","body":"Nearly all energy in ecosystems starts with sunlight. Producers, mostly plants and algae, capture it through photosynthesis. Consumers eat producers or other consumers, and decomposers such as fungi and bacteria break down dead material. At each transfer, roughly ninety percent of the energy is lost as heat, so only about ten percent passes to the next level. That is why food chains rarely exceed four or five links and why top predators are few."},
  {"heading":"Matter cycles","type":"example","body":"Unlike energy, matter is recycled. Carbon moves from air to plants through photosynthesis, into animals through eating, and back to the air through respiration, decay, and combustion. Water cycles through evaporation, condensation, precipitation, and runoff. Nitrogen is fixed from the air by bacteria, taken up by plants, and returned by decomposers. Decomposers are the unglamorous hinge of every cycle."},
  {"heading":"Interdependence and disturbance","type":"example","body":"Species interact through competition, predation, and symbiosis, which includes mutualism, commensalism, and parasitism. Removing one species can cascade. When wolves were reintroduced to Yellowstone in 1995, elk browsing patterns changed, willows and aspens recovered along streams, beaver and songbird numbers rose, and banks stabilized. A keystone species has an effect out of proportion to its numbers."},
  {"heading":"Try it yourself","type":"activity","body":"Build a food web with at least six organisms from a habitat near you, labeling producers, consumers, and decomposers. Then answer: if the producers were reduced by half, what happens to each level, and why does the effect grow larger as you move up the web?"}]'::jsonb);

INSERT INTO public.questions (id, lesson_id, kind, prompt, choices, answer, explanation, sort_order) VALUES
('q-alg1-p1','algebra-lesson-1','practice','In the expression 5x + 3, what is the coefficient?','["5","x","3","5x"]','5','The coefficient is the number multiplying the variable.',1),
('q-alg1-p2','algebra-lesson-1','practice','Evaluate 3n + 7 when n = 4.','["12","19","21","34"]','19','3(4) = 12, and 12 + 7 = 19.',2),
('q-alg1-c1','algebra-lesson-1','check','Which expression means four less than twice a number n?','["4 - 2n","2n - 4","2(n - 4)","4n - 2"]','2n - 4','Twice a number is 2n; four less than that subtracts 4 from it.',1),
('q-alg1-c2','algebra-lesson-1','check','A plan costs $15 plus $0.10 per gigabyte. What is the cost for 30 gigabytes?','["$15.30","$18.00","$45.00","$16.00"]','$18.00','15 + 0.10(30) = 15 + 3 = 18.',2),
('q-alg1-c3','algebra-lesson-1','check','How many terms are in the expression 7a + 2b - 5?','["1","2","3","4"]','3','Terms are separated by plus or minus signs: 7a, 2b, and -5.',3),
('q-alg2-p1','algebra-lesson-2','practice','Evaluate 2 + 3 x 4.','["20","14","24","9"]','14','Multiplication comes before addition: 3 x 4 = 12, then 2 + 12 = 14.',1),
('q-alg2-p2','algebra-lesson-2','practice','Evaluate 12 / 3 x 2.','["2","8","18","6"]','8','Division and multiplication are equal and worked left to right: 12/3 = 4, then 4 x 2 = 8.',2),
('q-alg2-c1','algebra-lesson-2','check','Evaluate 4 + 2(9 - 5)^2 / 8.','["8","12","36","6"]','8','Parentheses give 4, squared is 16, times 2 is 32, divided by 8 is 4, plus 4 is 8.',1),
('q-alg2-c2','algebra-lesson-2','check','Evaluate 10 - 2 - 3.','["11","5","9","15"]','5','Subtraction is done left to right: (10 - 2) - 3 = 5.',2),
('q-alg2-c3','algebra-lesson-2','check','Which step comes first in 3 x 2^3 - 10 / 5?','["3 x 2","2^3","10 / 5","3 x 2^3 - 10"]','2^3','Exponents are evaluated before multiplication and division.',3),
('q-alg3-p1','algebra-lesson-3','practice','Solve x + 7 = 12.','["x = 19","x = 5","x = -5","x = 84"]','x = 5','Subtract 7 from both sides.',1),
('q-alg3-p2','algebra-lesson-3','practice','Solve 4x = 20.','["x = 80","x = 16","x = 5","x = 24"]','x = 5','Divide both sides by 4.',2),
('q-alg3-c1','algebra-lesson-3','check','Solve t / 5 = 9.','["t = 45","t = 1.8","t = 14","t = 4"]','t = 45','Multiply both sides by 5.',1),
('q-alg3-c2','algebra-lesson-3','check','Solve 8 + k = 3.','["k = 11","k = 5","k = -5","k = -11"]','k = -5','Subtract 8 from both sides: k = 3 - 8 = -5.',2),
('q-alg3-c3','algebra-lesson-3','check','Which operation undoes multiplication?','["Addition","Subtraction","Division","Exponents"]','Division','Division is the inverse of multiplication.',3),
('q-hist1-p1','history-lesson-1','practice','Which development most directly allowed cities to form?','["Cave painting","Farming surplus","Long-distance running","Stone tools"]','Farming surplus','Stored surplus food let dense populations live in one place.',1),
('q-hist1-p2','history-lesson-1','practice','Job specialization means that','["everyone farms","people can do work other than producing food","only rulers work","villages stay small"]','people can do work other than producing food','Surplus frees some people from farming to do other jobs.',2),
('q-hist1-c1','history-lesson-1','check','Which is NOT usually listed as a feature of civilization?','["Cities","Record keeping","Nomadic herding","Organized government"]','Nomadic herding','Nomadic herding describes a mobile society rather than an urban one.',1),
('q-hist1-c2','history-lesson-1','check','Calling a society a civilization tells you about its','["moral worth","scale and organization","artistic talent","climate"]','scale and organization','The term is descriptive, not a ranking of worth.',2),
('q-hist1-c3','history-lesson-1','check','Public works such as canals and walls required','["writing only","organized labor and government","nomadic migration","no surplus"]','organized labor and government','Large projects need many workers directed and fed by an organized authority.',3),
('q-hist2-p1','history-lesson-2','practice','Which pair of rivers defined Mesopotamia?','["Nile and Indus","Tigris and Euphrates","Huang He and Yangtze","Amazon and Congo"]','Tigris and Euphrates','Mesopotamia means the land between the rivers.',1),
('q-hist2-p2','history-lesson-2','practice','Sumerian writing pressed into clay is called','["hieroglyphs","cuneiform","oracle bones","demotic"]','cuneiform','Cuneiform used wedge-shaped marks in clay tablets.',2),
('q-hist2-c1','history-lesson-2','check','The Indus Valley cities are best known for','["huge royal tombs","careful urban planning and drainage","oracle bone writing","pyramid building"]','careful urban planning and drainage','Harappa and Mohenjo-Daro had grid streets, standard bricks, and covered drains.',1),
('q-hist2-c2','history-lesson-2','check','Why did early civilizations cluster along rivers?','["Rivers prevented all flooding","Silt and water made farming productive","Rivers blocked trade","Rivers had no fish"]','Silt and water made farming productive','Annual floods renewed soil and supplied irrigation water.',2),
('q-hist2-c3','history-lesson-2','check','Egypt differed from Mesopotamia mainly because Egypt was','["unified early and protected by desert","a set of rival city-states","without writing","without rivers"]','unified early and protected by desert','Geography gave Egypt unusual political unity and security.',3),
('q-hist3-p1','history-lesson-3','practice','Who called Egypt the gift of the Nile?','["Ramesses II","Herodotus","Hatshepsut","Osiris"]','Herodotus','The Greek historian Herodotus used the phrase.',1),
('q-hist3-p2','history-lesson-3','practice','Egyptians called their fertile land','["Deshret","Kemet","Maat","Giza"]','Kemet','Kemet means the black land, named for the Nile silt.',2),
('q-hist3-c1','history-lesson-3','check','Maat refers to','["a type of tomb","order, balance, and justice","a river flood","a writing system"]','order, balance, and justice','The pharaoh was responsible for maintaining maat.',1),
('q-hist3-c2','history-lesson-3','check','The Rosetta Stone mattered because it','["was the largest pyramid","repeated one text in three scripts","recorded the Nile flood","was a royal tomb"]','repeated one text in three scripts','The Greek version let scholars decode hieroglyphs.',2),
('q-hist3-c3','history-lesson-3','check','The Giza pyramids were built mainly by','["organized crews of paid Egyptian workers","foreign armies","nomadic herders","Roman engineers"]','organized crews of paid Egyptian workers','Evidence shows organized, fed, and housed labor crews.',3),
('q-sci1-p1','science-lesson-1','practice','Which of these is NOT a characteristic of living things?','["Made of cells","Uses energy","Made of metal","Responds to stimuli"]','Made of metal','Material composition is not one of the characteristics of life.',1),
('q-sci1-p2','science-lesson-1','practice','Maintaining stable internal conditions is called','["metabolism","homeostasis","evolution","reproduction"]','homeostasis','Homeostasis is internal balance.',2),
('q-sci1-c1','science-lesson-1','check','Why is a candle flame not alive?','["It does not grow","It has no cells or homeostasis","It uses no energy","It never changes"]','It has no cells or homeostasis','A flame grows and uses fuel but lacks cells and internal regulation.',1),
('q-sci1-c2','science-lesson-1','check','Viruses are hard to classify because they','["are too large","cannot reproduce without a host cell","have many organelles","do not contain genetic material"]','cannot reproduce without a host cell','They evolve and carry genes but lack cells and metabolism.',2),
('q-sci1-c3','science-lesson-1','check','Which sequence lists levels of organization correctly?','["cell, tissue, organ, organ system","organ, tissue, cell, organism","tissue, cell, organ, molecule","organ system, organ, tissue, molecule, cell"]','cell, tissue, organ, organ system','Cells form tissues, tissues form organs, organs form systems.',3),
('q-sci2-p1','science-lesson-2','practice','Which cell type has no nucleus?','["Eukaryotic","Prokaryotic","Plant","Animal"]','Prokaryotic','Prokaryotes keep DNA in the cytoplasm, not a nucleus.',1),
('q-sci2-p2','science-lesson-2','practice','Which organelle releases energy from food?','["Ribosome","Mitochondrion","Golgi apparatus","Lysosome"]','Mitochondrion','Mitochondria carry out cellular respiration.',2),
('q-sci2-c1','science-lesson-2','check','Which three structures are found in plant cells but not animal cells?','["Nucleus, ribosomes, membrane","Cell wall, chloroplasts, large central vacuole","Mitochondria, lysosomes, Golgi","Cytoplasm, DNA, membrane"]','Cell wall, chloroplasts, large central vacuole','These three are characteristic of plant cells.',1),
('q-sci2-c2','science-lesson-2','check','Which is NOT part of cell theory?','["All living things are made of cells","Cells come from existing cells","The cell is the basic unit of life","All cells contain chloroplasts"]','All cells contain chloroplasts','Only photosynthetic cells have chloroplasts.',2),
('q-sci2-c3','science-lesson-2','check','A red blood cell has no nucleus mainly to','["move faster in air","make room for hemoglobin","photosynthesize","store waste"]','make room for hemoglobin','Losing the nucleus maximizes oxygen-carrying capacity and flexibility.',3),
('q-sci3-p1','science-lesson-3','practice','About how much energy passes to the next feeding level?','["90 percent","50 percent","10 percent","100 percent"]','10 percent','Roughly ninety percent is lost as heat at each transfer.',1),
('q-sci3-p2','science-lesson-3','practice','Sunlight, soil, and temperature are examples of','["biotic factors","abiotic factors","producers","decomposers"]','abiotic factors','Abiotic factors are the non-living parts of an ecosystem.',2),
('q-sci3-c1','science-lesson-3','check','Which statement is true?','["Energy cycles and matter flows one way","Matter cycles and energy flows one way","Both cycle","Neither moves"]','Matter cycles and energy flows one way','Matter is recycled; energy is lost as heat at each step.',1),
('q-sci3-c2','science-lesson-3','check','Decomposers are essential because they','["produce sunlight","return nutrients to the ecosystem","eat only predators","stop matter from cycling"]','return nutrients to the ecosystem','They break down dead material and release nutrients.',2),
('q-sci3-c3','science-lesson-3','check','A keystone species is one that','["is the largest in the ecosystem","has an effect out of proportion to its numbers","is always a producer","never interacts with others"]','has an effect out of proportion to its numbers','Wolves in Yellowstone are a classic example.',3);

-- ================= SEED: CAMPUS =================
INSERT INTO public.campus_zones (id, name, description, sort_order) VALUES
('welcome-plaza','Welcome Plaza','The bordeaux brick entrance to UNIFY University, with its fountain, welcome sign, and campus map.',1),
('central-quad','Central Quad','The green heart of campus, ringed by the academic halls and dotted with study tables.',2),
('study-gardens','Outdoor Study Gardens','Sage hedges, a lily pond, and quiet benches behind the Humanities Hall.',3),
('student-commons','Student Commons','A warm terracotta courtyard where students gather between classes.',4);

INSERT INTO public.campus_buildings (id, zone_id, name, description, departments, map_x, map_y) VALUES
('math-tech-hall','central-quad','Mathematics & Technology Hall','Ochre stone and tall windows; home of numbers and machines.','["Mathematics","Computer Science","Technology"]',10,6),
('science-hall','central-quad','Science & Discovery Hall','Lab benches, specimen cases, and a greenhouse on the roof.','["Biology","Chemistry","Earth Science","Physics"]',22,6),
('humanities-hall','central-quad','Humanities Hall','Deep green ivy over warm brown brick; seminar rooms and a writing studio.','["History","Literature","Writing","Philosophy","Social Studies"]',10,18),
('arts-center','central-quad','Arts & Creative Center','Studios lit by north windows, with a small recital hall.','["Visual Art","Music","Design"]',22,18),
('university-library','central-quad','University Library','Four floors of stacks, reading tables, quiet rooms, and the archives.','["Research","Archives"]',16,2),
('student-center','student-commons','Student Center','Lounge, cafeteria, club board, and the campus events wall.','["Student Life"]',28,12),
('career-center','student-commons','Career Center','Pathway displays for every LifePath field UNIFY supports.','["LifePath"]',28,20),
('administration','welcome-plaza','Administration','Admissions, Registrar, Academic Advising, and Family Services.','["Admissions","Registrar","Advising","Family Services"]',4,12),
('personal-space','welcome-plaza','Personal Student Space','Your own room: bed, desk, computer, bookshelf, and a wall of achievements.','["Home"]',4,22);

INSERT INTO public.campus_rooms (id, building_id, name, kind, course_id, lesson_id, sort_order) VALUES
('algebra-101','math-tech-hall','Algebra 101','classroom','foundations-algebra','algebra-lesson-1',1),
('algebra-204','math-tech-hall','Algebra 204','classroom','foundations-algebra','algebra-lesson-2',2),
('algebra-102','math-tech-hall','Algebra 102','classroom','foundations-algebra','algebra-lesson-3',3),
('computer-lab','math-tech-hall','Computer Lab','lab',NULL,NULL,4),
('math-study-room','math-tech-hall','Study Room','study',NULL,NULL,5),
('biology-lab','science-hall','Biology Lab','lab','intro-life-science','science-lesson-2',1),
('science-classroom','science-hall','Science Classroom','classroom','intro-life-science','science-lesson-1',2),
('laboratory','science-hall','Laboratory','lab','intro-life-science','science-lesson-3',3),
('history-101','humanities-hall','History 101','classroom','world-civilizations','history-lesson-1',1),
('literature-seminar','humanities-hall','Literature Seminar','classroom','world-civilizations','history-lesson-2',2),
('writing-studio','humanities-hall','Writing Studio','classroom','world-civilizations','history-lesson-3',3),
('art-studio','arts-center','Art Studio','studio',NULL,NULL,1),
('library-main','university-library','Reading Room','library',NULL,NULL,1),
('lounge','student-center','Student Lounge','social',NULL,NULL,1),
('career-hall','career-center','Pathway Hall','career',NULL,NULL,1),
('registrar','administration','Registrar','office',NULL,NULL,1),
('advising','administration','Academic Advising','office',NULL,NULL,2),
('dorm-room','personal-space','Your Room','home',NULL,NULL,1);

INSERT INTO public.campus_npcs (id, name, role, zone_id, room_id, greeting, behavior) VALUES
('guide-rosa','Rosa Delgado','campus guide','welcome-plaza',NULL,'Welcome to UNIFY University! Take the path north to the Quad and every hall opens off it.','walk'),
('student-amir','Amir Haddad','student','welcome-plaza',NULL,'First day? The fountain is the best meeting spot on campus.','sit'),
('student-june','June Okafor','student','central-quad',NULL,'I have Algebra 204 next. Professor Maya actually makes order of operations interesting.','study'),
('prof-maya','Professor Maya Ellison','faculty',NULL,'algebra-204','Welcome back. Are you ready for today''s lesson?','idle'),
('prof-idris','Professor Idris Vale','faculty',NULL,'algebra-101','Algebra begins with one idea: a letter can stand for a number.','idle'),
('prof-lena','Professor Lena Marsh','faculty',NULL,'algebra-102','Balance both sides and the answer takes care of itself.','idle'),
('prof-cole','Professor Anton Cole','faculty',NULL,'history-101','Before we can study civilizations, we need to agree on what one is.','idle'),
('prof-ines','Professor Ines Barros','faculty',NULL,'literature-seminar','Four rivers, four beginnings. Shall we compare them?','idle'),
('prof-nkem','Professor Nkem Aduba','faculty',NULL,'writing-studio','Egypt lasted three thousand years. Let us find out why.','idle'),
('prof-hale','Professor Sam Hale','faculty',NULL,'science-classroom','Here is a hard question to start with: what makes something alive?','idle'),
('prof-park','Professor Yuna Park','faculty',NULL,'biology-lab','Put on the goggles. Today the cell gets taken apart.','idle'),
('prof-reyes','Professor Marco Reyes','faculty',NULL,'laboratory','Everything in an ecosystem is connected. Let us trace the energy.','idle'),
('librarian-teodora','Teodora Ash','librarian',NULL,'library-main','Quiet floor is upstairs. What are you researching today?','read'),
('advisor-nadia','Nadia Whitfield','advisor',NULL,'advising','Let us look at your academic plan together.','idle'),
('registrar-owen','Owen Blackwood','administrator',NULL,'registrar','I can pull up your transcript whenever you need it.','idle'),
('career-tam','Tam Sorensen','advisor',NULL,'career-hall','Careers are paths, not labels. Which field interests you?','idle');
