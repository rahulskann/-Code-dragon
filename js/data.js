/* CODE DRAGON — game content — EDIT ME MOST
   HERO_DATA = the three classes (name, role, the topic Gemini is told to quiz).
   BANK = the offline / fallback multiple-choice questions. Add or change questions freely. */

/* =========================================================
   CLASS DATA
========================================================= */
const HERO_DATA = {
  mage:    {name:"MAGE",    role:"Front-End Engineer", topic:"front-end web development (HTML, CSS, JavaScript, React, the DOM, accessibility, performance)", blurb:"Weaves UI from light & layout.", color:"#9a72ea"},
  fighter: {name:"FIGHTER", role:"Back-End Engineer",  topic:"back-end engineering (HTTP, REST APIs, databases, SQL, caching, concurrency, system design)", blurb:"Holds the line at the server gate.", color:"#ff6a52"},
  thief:   {name:"THIEF",   role:"Security Engineer",  topic:"cybersecurity (web vulnerabilities, cryptography basics, authentication, network security, threat modeling)", blurb:"Slips through every weak defense.", color:"#46d36b"},
};


/* =========================================================
   STATIC QUESTION BANK  (Classic mode + AI fallback)
========================================================= */
const BANK = {
  mage:[
    {q:"Which React Hook runs side effects after render?",a:["useState","useMemo","useEffect","useRef"],c:2},
    {q:"What does `===` check that `==` does not?",a:["Nothing","Type, with no coercion","Only references","Truthiness"],c:1},
    {q:"`box-sizing: border-box` makes width include…",a:["Only content","Padding & border","Margin","Nothing"],c:1},
    {q:"The DOM is best described as…",a:["A CSS framework","A tree of the page","A build tool","A database"],c:1},
    {q:"`event.preventDefault()` does what?",a:["Stops bubbling","Prevents default browser action","Removes the node","Reloads"],c:1},
    {q:"In CSS specificity, which wins?",a:["Element","Class","ID","All equal"],c:2},
    {q:"`flex: 1` mostly controls…",a:["z-index","How it grows to fill space","Font size","Border radius"],c:1},
    {q:"Which stops an event bubbling up?",a:["preventDefault()","stopPropagation()","returnFalse()","cancelBubble()"],c:1},
  ],
  fighter:[
    {q:"Which HTTP method is idempotent & replaces a resource?",a:["POST","PATCH","PUT","CONNECT"],c:2},
    {q:"HTTP 404 means…",a:["Server error","Created","Not Found","Unauthorized"],c:2},
    {q:"A database index mainly improves…",a:["Write throughput","Read/lookup speed","Storage size","Backups"],c:1},
    {q:"In ACID, the 'A' stands for…",a:["Availability","Atomicity","Auth","Allocation"],c:1},
    {q:"A primary key's job is to…",a:["Encrypt the row","Uniquely identify each row","Sort the table","Compress"],c:1},
    {q:"Best code for a created resource?",a:["200 OK","201 Created","204 No Content","302 Found"],c:1},
    {q:"A load balancer's core job is to…",a:["Cache files","Distribute traffic","Compile code","Store sessions"],c:1},
    {q:"HTTP is best described as…",a:["Stateful","Stateless","Encrypted by default","Peer-to-peer"],c:1},
  ],
  thief:[
    {q:"XSS is an attack that…",a:["Floods a server","Injects scripts into pages","Cracks passwords","Sniffs Wi-Fi"],c:1},
    {q:"What does HTTPS add over HTTP?",a:["Speed","Encryption in transit","Caching","Compression"],c:1},
    {q:"Hashing passwords (vs encrypting) is preferred because…",a:["It's reversible","It's one-way","It's faster to read","It uses less space"],c:1},
    {q:"SQL injection is mitigated mainly by…",a:["Hiding the DB","Parameterized queries","Bigger servers","HTTPS"],c:1},
    {q:"2FA adds security by requiring…",a:["A longer password","A second factor","A new email","A VPN"],c:1},
    {q:"A firewall primarily…",a:["Encrypts disks","Filters network traffic","Hashes data","Backs up files"],c:1},
    {q:"CSRF tricks a user's browser into…",a:["Leaking the DOM","Sending an unwanted authed request","Mining crypto","Disabling JS"],c:1},
    {q:"Principle of least privilege means…",a:["Admins for all","Minimum access needed","No passwords","Open ports"],c:1},
  ],
};
