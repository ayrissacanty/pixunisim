/* hq-data.js — canonical shared catalog for the UNIFY Academy admin (config) apps.
   Plain script (no modules). Defines window.UNIFY_HQ_DATA.
   Loaded by hq.html, academy-control.html, staff.html, customize.html, curriculum-builder.html.
   Every consumer degrades gracefully if this file is missing. */
window.UNIFY_HQ_DATA = {
  version: 1,
  note: "Canonical catalog of main-app assets & data. source: public/assets/unify/",

  teachers: [
    {id:"bello", name:"Mr. Bello", subject:"Hall Monitor", room:"Hallway", age:null, gender:"M", personality:"kind", skin:"#7a4a36", hair:"#2b2b33", hairStyle:"crop", outfit:"vest", quirk:"keeps spare pencils in every pocket", gestures:{idle:"still",signature:"wave"}},
    {id:"tanaka", name:"Mr. Hiroshi Tanaka", short:"Tanaka", subject:"Mathematics", room:"Room 112", age:52, gender:"M", personality:"nerdy", skin:"#E2B98F", eye:"#2A1C12", brow:"#4A4541", build:{h:.97,w:.92}, gestures:{idle:"nod",signature:"finger"}},
    {id:"ayrissa", name:"Ms. Ayrissa", short:"Ayrissa", subject:"English & Creative Writing", room:"Room 220", age:36, gender:"F", personality:"cheerful", skin:"#734633", eye:"#2A160E", brow:"#18100B", build:{h:1,w:1.03}, gestures:{idle:"bounce",signature:"wave"}},
    {id:"okafor", name:"Ms. Adaeze Okafor", short:"Okafor", subject:"Chemistry", room:"Lab 204", age:38, gender:"F", personality:"nerdy", skin:"#6B4226", eye:"#3B2314", brow:"#1A120D", build:{h:1.06,w:.98}, gestures:{idle:"still",signature:"finger"}},
    {id:"obrien", name:"Mr. Declan O'Brien", short:"O'Brien", subject:"History", room:"Room 301", age:45, gender:"M", personality:"funny", skin:"#F0C8AE", eye:"#5A7A4A", brow:"#8A3C1E", build:{h:1,w:1.14}, gestures:{idle:"sway",signature:"shrug"}},
    {id:"haddad", name:"Mr. Karim Haddad", short:"Haddad", subject:"Geography & Careers", room:"CarryingCareers", age:41, gender:"M", personality:"kind", skin:"#B98460", eye:"#3A2412", brow:"#16100C", build:{h:1.03,w:1.02}, gestures:{idle:"still",signature:"explain"}},
    {id:"park", name:"Ms. Chloe Park", short:"Park", subject:"Computer Science", room:"Lab 110", age:27, gender:"F", personality:"curious", skin:"#F1D1B5", eye:"#2A1A12", brow:"#1A1210", build:{h:.92,w:.94}, gestures:{idle:"bounce",signature:"wave"}},
    {id:"larsen", name:"Dr. Ingrid Larsen", short:"Larsen", subject:"Life Lessons", room:"Life Lessons", age:60, gender:"F", personality:"kind", skin:"#F3D6C6", eye:"#4F86B8", brow:"#B8AE9E", build:{h:1.02,w:1}, gestures:{idle:"nod",signature:"finger"}},
    {id:"raman", name:"Mrs. Priya Raman", short:"Raman", subject:"English Literature", room:"Room 215", age:44, gender:"F", personality:"dreamy", skin:"#A8703F", eye:"#2A160C", brow:"#1C120C", build:{h:.95,w:.97}, gestures:{idle:"tilt",signature:"explain"}}
  ],

  students: {
    count: 56,
    seed: 20260930,
    note: "56 unique named students generated in-game with their own looks, grades, personalities, interests and backstories",
    firstNames: ["Maya","Marcus","Priya","Leo","Amara","Diego","Sofia","Kenji","Zara","Eli","Nadia","Tobias","Imani","Mateo","Hana","Omar","Lucia","Jonah","Anika","Caleb","Mei","Ravi","Talia","Felix","Yara","Ben","Chloe","Dev","Esme","Finn","Grace","Hugo","Isla","Jamal","Keira","Liam","Mira","Noah","Olive","Pablo","Quinn","Rosa","Sam","Tessa","Uma","Victor","Willa","Xavier","Yusuf","Zoe","Aiden","Bella","Cyrus","Daria","Emil","Farah","Gus","Harper"]
  },

  subjects: [
    {id:"math", label:"Math"},
    {id:"ela", label:"ELA"},
    {id:"science", label:"Science"},
    {id:"history", label:"History"},
    {id:"careers", label:"CarryingCareers"},
    {id:"life", label:"Life Lessons"}
  ],

  rooms: [
    {id:"hallway", label:"Hallway"},
    {id:"classroom3d", label:"Classroom 3D"},
    {id:"auditorium3d", label:"Auditorium 3D"},
    {id:"dorm", label:"Dorm"},
    {id:"news", label:"News Studio"},
    {id:"fieldtrip", label:"Field Trip"},
    {id:"room-112", label:"Room 112 (Math — Tanaka)"},
    {id:"room-220", label:"Room 220 (English — Ayrissa)"},
    {id:"lab-204", label:"Lab 204 (Chemistry — Okafor)"},
    {id:"room-301", label:"Room 301 (History — O'Brien)"},
    {id:"lab-110", label:"Lab 110 (Computer Science — Park)"},
    {id:"room-215", label:"Room 215 (English Lit — Raman)"}
  ],

  assets: {
    note: "source: public/assets/unify/",
    characters: {students:119, teachers:42, seatviewStudents:20, seatviewTeachers:16},
    auditorium: {science:20, ela:20, math:19, history:19, general:15, screens:10},
    architecture: ["doors","floors","walls"],
    decor: ["art","ela","history","math","science","technology"],
    fpv: 49,
    hall: 28,
    seatview: 14,
    textbook: 11,
    plants: "yes",
    atlas: "yes"
  }
};
