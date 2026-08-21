export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const CEFR_ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** High-frequency CEFR anchors — keeps common words accurate without an API call. */
const CEFR_LISTS: Record<CefrLevel, string[]> = {
  A1: [
    "a", "an", "the", "i", "you", "he", "she", "it", "we", "they", "be", "am", "is", "are",
    "have", "has", "do", "does", "go", "come", "get", "make", "see", "know", "want", "like",
    "good", "bad", "big", "small", "new", "old", "hot", "cold", "yes", "no", "please", "thanks",
    "hello", "hi", "bye", "name", "man", "woman", "boy", "girl", "child", "friend", "family",
    "mother", "father", "dad", "mom", "brother", "sister", "house", "home", "school", "work",
    "water", "food", "bread", "milk", "apple", "book", "pen", "car", "bus", "day", "night",
    "time", "year", "week", "today", "tomorrow", "yesterday", "one", "two", "three", "red",
    "blue", "green", "black", "white", "happy", "sad", "love", "eat", "drink", "sleep", "walk",
    "run", "read", "write", "speak", "listen", "open", "close", "help", "stop", "start",
  ],
  A2: [
    "about", "after", "again", "also", "always", "another", "because", "before", "better",
    "between", "both", "buy", "call", "change", "city", "clean", "clothes", "country",
    "different", "early", "easy", "enough", "every", "example", "excuse", "family", "feel",
    "few", "finish", "first", "free", "full", "great", "happen", "hard", "health", "holiday",
    "hope", "hour", "important", "interest", "job", "keep", "kind", "late", "learn", "leave",
    "letter", "life", "little", "long", "maybe", "meet", "money", "month", "more", "most",
    "much", "must", "near", "need", "never", "next", "often", "only", "other", "own", "paper",
    "part", "people", "place", "play", "problem", "put", "question", "quick", "ready", "really",
    "remember", "right", "same", "say", "second", "should", "show", "something", "sometimes",
    "soon", "still", "story", "sure", "talk", "tell", "thing", "think", "through", "travel",
    "try", "under", "until", "use", "visit", "wait", "watch", "weather", "while", "why",
    "without", "world", "young",
  ],
  B1: [
    "achieve", "advice", "agree", "allow", "almost", "already", "although", "appear", "apply",
    "argue", "arrive", "attention", "avoid", "aware", "believe", "belong", "benefit", "borrow",
    "bother", "bright", "build", "busy", "career", "cause", "certain", "chance", "choice",
    "claim", "clear", "common", "compare", "complete", "consider", "continue", "control",
    "correct", "create", "culture", "decide", "describe", "develop", "difference", "difficult",
    "discover", "discuss", "during", "effect", "effort", "either", "encourage", "enjoy",
    "enough", "environment", "especially", "expect", "experience", "explain", "fact", "fail",
    "famous", "fear", "finally", "follow", "foreign", "forget", "form", "future", "general",
    "government", "guess", "habit", "however", "improve", "include", "increase", "instead",
    "invite", "issue", "language", "least", "local", "manage", "matter", "mean", "mention",
    "mind", "modern", "nature", "necessary", "notice", "offer", "opinion", "opportunity",
    "order", "particular", "perhaps", "personal", "point", "possible", "prefer", "prepare",
    "present", "prevent", "probably", "provide", "public", "purpose", "quality", "quite",
    "reason", "receive", "recent", "reduce", "refuse", "regard", "relate", "remain", "report",
    "require", "respect", "result", "return", "risk", "rule", "seem", "sense", "several",
    "share", "similar", "simple", "situation", "society", "solve", "special", "spend",
    "standard", "state", "suggest", "support", "surprise", "system", "though", "toward",
    "understand", "usually", "value", "various", "view", "whether", "within", "wonder",
  ],
  B2: [
    "abandon", "absolute", "abstract", "accurate", "acknowledge", "acquire", "adapt", "adequate",
    "adjust", "advance", "affect", "allocate", "alternative", "analysis", "ancient", "anticipate",
    "anxiety", "apparent", "approach", "appropriate", "approximate", "aspect", "assess",
    "assume", "attach", "attitude", "attribute", "authority", "available", "aware", "awkward",
    "barrier", "basically", "behalf", "bias", "brief", "capable", "capacity", "challenge",
    "characteristic", "circumstance", "cite", "clarify", "collapse", "colleague", "commit",
    "complex", "component", "compose", "comprehensive", "conceive", "concentrate", "concept",
    "concern", "conclude", "concrete", "conduct", "conflict", "consequence", "considerable",
    "consistent", "constant", "constitute", "construct", "consume", "contemporary", "context",
    "contribute", "controversial", "convenient", "convince", "cooperate", "core", "correspond",
    "crucial", "debate", "decade", "decline", "define", "demonstrate", "dense", "deny",
    "depress", "derive", "despite", "detect", "determine", "devote", "dimension", "diminish",
    "discipline", "dispute", "distinct", "distribute", "diverse", "domestic", "dominate",
    "draft", "dramatic", "duration", "economy", "efficient", "element", "eliminate", "emerge",
    "emphasis", "enable", "encounter", "enhance", "enormous", "ensure", "entire", "equivalent",
    "establish", "estimate", "evaluate", "eventually", "evidence", "evolve", "exceed", "exclude",
    "expand", "expert", "explicit", "exploit", "explore", "expose", "extend", "external",
    "facilitate", "factor", "feature", "federal", "flexible", "focus", "framework", "frequent",
    "function", "fundamental", "furthermore", "generate", "glance", "global", "goal", "grade",
    "grant", "guarantee", "guideline", "hence", "highlight", "hypothesis", "identical",
    "identify", "ignore", "illustrate", "image", "impact", "implement", "imply", "impose",
    "incentive", "incident", "income", "independent", "indicate", "individual", "inevitable",
    "infer", "influence", "initial", "initiative", "injury", "innovation", "input", "inquiry",
    "insight", "inspect", "inspire", "instance", "institute", "integrate", "intelligent",
    "intend", "intense", "interact", "internal", "interpret", "intervene", "invest", "involve",
    "isolate", "journal", "justify", "label", "labour", "layer", "lecture", "legal", "legislate",
    "liable", "liberal", "licence", "likewise", "link", "locate", "logic", "maintain", "major",
    "manual", "margin", "mature", "mechanism", "media", "medical", "medium", "mental", "method",
    "migrate", "military", "minimal", "ministry", "minor", "mode", "modify", "monitor", "motive",
    "mutual", "negative", "network", "neutral", "nonetheless", "norm", "notion", "novel",
    "objective", "obtain", "obvious", "occupy", "occur", "odd", "offset", "ongoing", "option",
    "orient", "outcome", "output", "overall", "overcome", "overlap", "overseas", "panel",
    "parallel", "parameter", "participate", "partner", "passive", "perceive", "percent",
    "period", "persist", "phase", "phenomenon", "philosophy", "physical", "plus", "policy",
    "portion", "pose", "positive", "potential", "poverty", "practical", "precede", "precise",
    "predict", "preliminary", "preserve", "previous", "primary", "principle", "prior",
    "priority", "procedure", "process", "produce", "professional", "profit", "project",
    "promote", "proportion", "prospect", "protect", "protest", "prove", "psychology", "publish",
    "purchase", "pursue", "qualify", "quote", "radical", "random", "range", "rank", "rapid",
    "ratio", "rational", "react", "recover", "refine", "reflect", "reform", "region", "register",
    "regulate", "reinforce", "reject", "release", "relevant", "reliable", "rely", "remove",
    "render", "renew", "replace", "represent", "reproduce", "request", "research", "reside",
    "resolve", "resource", "respond", "restore", "restrain", "restrict", "retain", "reveal",
    "revenue", "reverse", "review", "revise", "revolution", "reward", "rigid", "role", "route",
    "routine", "scenario", "schedule", "scheme", "scope", "section", "sector", "secure", "seek",
    "select", "sequence", "series", "severe", "shift", "significant", "similar", "simulate",
    "site", "so-called", "sole", "somewhat", "source", "specific", "specify", "sphere", "stable",
    "statistic", "status", "steady", "strategy", "stress", "structure", "style", "submit",
    "subsequent", "subsidy", "substitute", "succeed", "sufficient", "sum", "summary", "supplement",
    "survey", "survive", "sustain", "symbol", "target", "task", "team", "technical", "technique",
    "technology", "temporary", "tend", "tense", "terminate", "text", "theme", "theory", "thereby",
    "thesis", "topic", "trace", "tradition", "transfer", "transform", "transit", "transmit",
    "transport", "trend", "trigger", "ultimate", "undergo", "underlie", "undertake", "uniform",
    "unify", "unique", "unit", "universe", "unlike", "update", "upgrade", "uphold", "urge",
    "utility", "utilize", "valid", "vary", "vehicle", "version", "via", "victim", "violate",
    "virtual", "visible", "vision", "visual", "volume", "voluntary", "welfare", "whereas",
    "whereby", "widespread", "willing", "withdraw", "witness", "workshop", "yield",
  ],
  C1: [
    "abolish", "abundance", "accelerate", "accessible", "accommodate", "accountability",
    "accumulate", "accusation", "acute", "adjacent", "adverse", "advocate", "aesthetic",
    "affiliate", "affirm", "aggregate", "aggression", "albeit", "align", "allegation",
    "allocate", "ambiguous", "amend", "amid", "amplify", "analogy", "anomaly", "anonymous",
    "apparatus", "appease", "appendix", "applicable", "appraisal", "arbitrary", "arc",
    "archaic", "articulate", "ascertain", "aspiration", "assert", "assimilate", "attain",
    "augment", "authentic", "autonomous", "avert", "backbone", "benchmark", "beneficiary",
    "bolster", "breach", "breakthrough", "bureaucracy", "campaign", "candidate", "catalyst",
    "catastrophe", "caution", "cease", "census", "coherent", "coincide", "collaborate",
    "collateral", "commence", "commodity", "compel", "compensate", "competence", "compile",
    "complement", "comply", "comprise", "compulsory", "concede", "conceive", "concurrent",
    "condemn", "confer", "confine", "conform", "consensus", "consent", "conserve", "constrain",
    "contemplate", "contend", "contiguous", "contingent", "contradict", "contrary", "convene",
    "converge", "converse", "convey", "conviction", "correlate", "counterpart", "credible",
    "criterion", "cultivate", "cumulative", "curtail", "custody", "cynical", "deficit",
    "delegate", "deliberate", "depict", "deploy", "deprive", "designate", "deter", "detrimental",
    "deviate", "diagnose", "dictate", "differentiate", "diffuse", "dilemma", "diligent",
    "disclose", "discrepancy", "discrete", "discretion", "discriminate", "displace", "disrupt",
    "disseminate", "dissolve", "distort", "divert", "doctrine", "domain", "dwell", "dynamic",
    "elaborate", "elicit", "eloquent", "embark", "embody", "empirical", "encompass", "endorse",
    "endure", "enforce", "engage", "enrich", "entail", "entity", "envisage", "epidemic",
    "equate", "equilibrium", "erode", "escalate", "essence", "ethical", "ethnic", "evoke",
    "exacerbate", "excerpt", "execute", "exemplify", "exhaustive", "exotic", "expedite",
    "expertise", "explicit", "exponential", "extrapolate", "fabricate", "facilitate", "feasible",
    "flaw", "fluctuate", "foresee", "formulate", "forthcoming", "foster", "fragile", "fragment",
    "fraud", "friction", "frustrate", "fulfill", "functional", "gauge", "gender", "genetic",
    "genuine", "glimpse", "governance", "grasp", "gravity", "gross", "habitat", "harmony",
    "hazard", "hierarchy", "hostile", "humanitarian", "hypothesis", "identical", "ideology",
    "ignorance", "illuminate", "imminent", "immune", "impair", "imperative", "implicate",
    "implicit", "impose", "incentive", "inclination", "inclusive", "incorporate", "incur",
    "indigenous", "induce", "inevitable", "infamous", "infrastructure", "inherent", "inhibit",
    "initiate", "inject", "innovative", "inquiry", "insight", "integral", "integrity", "intensify",
    "intent", "interim", "intermittent", "intervene", "intimate", "intrinsic",     "invoke", "irony",
    "jurisdiction", "landmark", "latent", "legitimate", "levy", "liability",
    "literacy", "lucrative", "magnitude", "mandate", "manipulate", "marginal", "mediate",
    "merger", "metaphor", "millennium", "minimize", "mobilize", "momentum", "monetary",
    "monopoly", "narrative", "negotiate", "nuance", "oblige", "obscure", "obstacle",
    "omit", "onset", "opponent", "optimal", "originate", "outbreak", "outweigh", "oversee",
    "overwhelm", "paradigm", "paradox", "pathway", "penalty", "perception", "perspective",
    "persuasive", "pervasive", "petition", "pioneer", "plausible", "plunge", "polarize",
    "portfolio", "portray", "postpone", "potent", "pragmatic", "precaution", "precedent",
    "predator", "predecessor", "predominantly", "prejudice", "premise", "premium", "prescribe",
    "prestige", "presumably", "prevail", "prevalent", "primarily", "proclaim", "profound",
    "prohibit", "prominent", "prone", "propaganda", "propel", "prosecute", "prosperity",
    "protocol", "provoke", "prudence", "quantitative", "quest", "quota", "rally", "ratify",
    "reassure", "recede", "recipient", "reckon", "reconcile", "recount", "rectify", "recur",
    "redeem", "redundant", "refuge", "regime", "relapse", "relentless", "reluctant", "remedy",
    "remnant", "renowned", "repeal", "repel", "replicate", "reportedly", "repository",
    "resemble", "resent", "residual", "resign", "resist", "restrain", "resume", "retrieve",
    "rhetoric", "rigorous", "robust", "sanction", "scenario", "scrutiny", "seamless",
    "sectoral", "seminar", "sensitive", "sentiment", "setback", "shortcoming", "skeptical",
    "sophisticated", "sparse", "specimen", "speculate", "stabilize", "stakeholder", "stance",
    "static", "stereotype", "stimulate", "straightforward", "strategic", "strengthen",
    "strive", "stumble", "subjective", "subordinate", "subscribe", "subtle", "successor",
    "sue", "suffice", "superb", "superior", "supervise", "supplementary", "suppress",
    "surge", "surplus", "surveillance", "susceptible", "sustainable", "swap", "swift",
    "symbolic", "sympathetic", "symposium", "synthesis", "tackle", "tangible", "tariff",
    "tempt", "tenant", "tentative", "terminate", "testify", "texture", "theoretical",
    "thereafter", "thorough", "threaten", "threshold", "thrive", "tighten", "tolerance",
    "toll", "tone", "toxic", "trade-off", "trait", "transcript", "transition", "transparent",
    "trauma", "treasury", "treaty", "tremendous", "tribute", "trigger", "triple", "trivial",
    "troop", "tuition", "turnout", "ultimate", "undergo", "undermine", "undertake", "unfold",
    "unify", "unprecedented", "unveil", "uphold", "urgency", "usage", "utilize", "vague",
    "validity", "vanish", "variable", "variance", "vendor", "venture", "verbal", "verify",
    "versus", "vessel", "veteran", "viable", "vibrant", "vicious", "violate", "virtue",
    "vital", "vocabulary", "vocational", "void", "vulnerable", "warrant", "watershed",
    "weaken", "weave", "whereby", "whilst", "widen", "widespread", "wisdom", "withdraw",
    "withstand", "workforce", "workplace", "worthwhile", "wreck", "xenophobia", "yield",
  ],
  C2: [
    "aberration", "abhor", "abject", "abrogate", "abscond", "abstruse", "accolade", "acerbic",
    "acrimony", "adroit", "adulation", "affluent", "alacrity", "alchemy", "altruism", "amenable",
    "amiable", "amorphous", "anachronism", "anathema", "anodyne", "antipathy", "antithesis",
    "aplomb", "apocryphal", "approbation", "arbitrary", "arcane", "arduous", "ascetic", "aspersion",
    "assiduous", "astute", "atrophy", "attenuate", "audacious", "austere", "avarice", "banal",
    "beguile", "belie", "bellicose", "benign", "bequeath", "berate", "bereft", "blight", "blithe",
    "boorish", "brevity", "brusque", "bucolic", "burgeon", "byzantine", "cajole", "callous",
    "calumny", "candor", "capricious", "castigate", "caustic", "censure", "chagrin", "chicanery",
    "circumspect", "clandestine", "coerce", "cogent", "commensurate", "complacent", "conciliate",
    "concomitant", "conflagration", "confluence", "conjecture", "connoisseur", "consternation",
    "consummate", "contemptuous", "contentious", "contrite", "contumacious", "conundrum",
    "convivial", "corpulent", "corroborate", "cosmopolitan", "covenant", "credulous", "culpable",
    "cursory", "dauntless", "dearth", "debacle", "debase", "debilitate", "decorum", "deference",
    "deft", "deleterious", "delineate", "demagogue", "demure", "denigrate", "deplete", "deplore",
    "deprecate", "deride", "derivative", "despot", "desultory", "diaphanous", "diatribe",
    "didactic", "diffident", "dilatory", "dilettante", "dirge", "disabuse", "discerning",
    "discomfit", "discordant", "discreet", "discursive", "disingenuous", "disparage", "disparate",
    "dispassionate", "dispel", "dissemble", "disseminate", "dissident", "dissolution", "dissonance",
    "distend", "divisive", "docile", "dogmatic", "dour", "duplicity", "duress", "ebullient",
    "eclectic", "edify", "effervescent", "efficacious", "effrontery", "egalitarian", "egregious",
    "elegy", "elicit", "elucidate", "emaciated", "embellish", "eminent", "emulate", "enervate",
    "engender", "enigma", "ennui", "ephemeral", "epicure", "epiphany", "epitome", "equanimity",
    "equivocate", "erudite", "esoteric", "espouse", "ethereal", "eulogy", "euphemism", "evanescent",
    "exacerbate", "exacting", "exculpate", "exigent", "exonerate", "exorbitant", "expedient",
    "expiate", "extol", "extraneous", "exuberant", "facetious", "fallacious", "fatuous", "fawn",
    "felicitous", "feral", "fervor", "fetid", "fidelity", "florid", "flout", "foment", "forbearance",
    "forestall", "fortuitous", "fractious", "frenetic", "froward", "frugal", "fulminate", "furtive",
    "gainsay", "garrulous", "gauche", "germane", "glib", "gregarious", "guile", "hackneyed",
    "harbinger", "haughty", "hedonist", "hegemony", "heretic", "heterogeneous", "hiatus",
    "hierarchy", "histrionic", "homily", "homogeneous", "hubris", "hyperbole", "iconoclast",
    "idiosyncrasy", "ignominious", "imbue", "immutable", "impassive", "impecunious", "imperious",
    "imperturbable", "impervious", "impetuous", "implacable", "implicit", "importune", "impregnable",
    "impudent", "impugn", "inane", "inchoate", "incisive", "incongruous", "incontrovertible",
    "incredulous", "inculcate", "indefatigable", "indelible", "indigent", "indolent", "ineffable",
    "ineluctable", "inept", "inexorable", "ingenuous", "ingrate", "inimical", "iniquity",
    "innocuous", "inscrutable", "insipid", "insolent", "insular", "intractable", "intransigent",
    "intrepid", "inure", "invective", "inveterate", "irascible", "ire", "irksome", "irreverent",
    "jocular", "juxtapose", "laconic", "lament", "languid", "largesse", "laud", "lavish",
    "lethargic", "levity", "libertine", "limpid", "linchpin", "lithe", "livid", "loquacious",
    "lucid", "lugubrious", "luminous", "lurid", "machination", "magnanimous", "maladroit",
    "malfeasance", "malign", "malleable", "maverick", "mawkish", "maxim", "mendacious",
    "mercurial", "meticulous", "mire", "misanthrope", "mitigate", "mollify", "morose", "multifarious",
    "mundane", "munificent", "myriad", "nadir", "nascent", "nebulous", "nefarious", "neophyte",
    "nettle", "noisome", "nonplussed", "nostalgia", "notorious", "noxious", "nuance", "obdurate",
    "obfuscate", "oblique", "obsequious", "obsolete", "obstinate", "obtuse", "obviate", "occlude",
    "odious", "officious", "onerous", "opaque", "opine", "opprobrium", "oscillate", "ostensible",
    "ostentatious", "ostracize", "overwrought", "palatable", "palliate", "panacea", "paragon",
    "paramount", "pariah", "parochial", "parsimonious", "partisan", "pathos", "paucity", "peccadillo",
    "pedantic", "pejorative", "pellucid", "penchant", "penitent", "penurious", "perennial",
    "perfidious", "perfunctory", "pernicious", "perspicacious", "pertinacious", "peruse", "pervasive",
    "petulant", "phlegmatic", "pithy", "placate", "placid", "platitude", "plethora", "plummet",
    "polemical", "ponderous", "portent", "pragmatic", "precarious", "precipitate", "preclude",
    "precocious", "predilection", "preeminent", "prepossessing", "prescient", "prevaricate",
    "pristine", "probity", "proclivity", "prodigal", "prodigious", "profligate", "profundity",
    "proliferate", "prolific", "propensity", "propitious", "prosaic", "proscribe", "protean",
    "protégé", "provincial", "prudent", "pugnacious", "punctilious", "pundit", "pungent",
    "pusillanimous", "quagmire", "quell", "querulous", "quixotic", "quotidian", "rancor",
    "rapacious", "rarefied", "recalcitrant", "recant", "recondite", "redolent", "redoubtable",
    "refractory", "refute", "relegate", "remonstrate", "renege", "replete", "reprehensible",
    "reproach", "reprobate", "repudiate", "rescind", "resilient", "resolute", "respite", "restive",
    "reticent", "reverent", "rhetoric", "ribald", "rife", "robust", "rudimentary", "ruminate",
    "sacrosanct", "sagacious", "salient", "sanctimonious", "sanguine", "sardonic", "satiate",
    "scathing", "scintillating", "scrupulous", "sedulous", "serendipity", "servile", "singular",
    "sinuous", "skeptic", "solicitous", "solvent", "soporific", "sordid", "specious", "sporadic",
    "spurious", "staid", "stigmatize", "stolid", "striated", "strident", "stupefy", "stymie",
    "subjugate", "sublime", "subpoena", "substantiate", "subterfuge", "subversive", "succinct",
    "supercilious", "superfluous", "supplant", "surfeit", "surreptitious", "sycophant", "tacit",
    "taciturn", "tangential", "tantamount", "tedious", "temerity", "tenacious", "tendentious",
    "tenuous", "terse", "timorous", "tirade", "torpid", "tortuous", "tractable", "transient",
    "transmute", "travesty", "trenchant", "truculent", "ubiquitous", "umbrage", "uncanny",
    "unconscionable", "unctuous", "upbraid", "usurp", "vacillate", "vapid", "variegated",
    "vehement", "venal", "venerate", "veracity", "verbose", "vex", "vicarious", "vicissitude",
    "vilify", "vindicate", "virulent", "viscous", "vitiate", "vitriolic", "vociferous", "volatile",
    "voracious", "wary", "welter", "whimsical", "wily", "winsome", "wistful", "zealot", "zenith",
  ],
};

const LOOKUP = new Map<string, CefrLevel>();
for (const level of CEFR_ORDER) {
  for (const word of CEFR_LISTS[level]) {
    LOOKUP.set(word.toLowerCase(), level);
  }
}

export function cefrToDifficulty(cefr: CefrLevel): 1 | 2 | 3 | 4 | 5 {
  switch (cefr) {
    case "A1":
      return 1;
    case "A2":
      return 2;
    case "B1":
      return 3;
    case "B2":
      return 4;
    case "C1":
    case "C2":
      return 5;
  }
}

export function difficultyToCefr(difficulty: number): CefrLevel {
  if (difficulty <= 1) return "A1";
  if (difficulty === 2) return "A2";
  if (difficulty === 3) return "B1";
  if (difficulty === 4) return "B2";
  return "C1";
}

function parseCefr(raw: string): CefrLevel | null {
  const m = raw.trim().toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/);
  return m ? (m[1] as CefrLevel) : null;
}

/** Heuristic when word is not in curated lists / Gemini unavailable. */
export function estimateCefrHeuristic(english: string): CefrLevel {
  const w = english.trim().toLowerCase().replace(/[^a-z'-]/g, "");
  if (!w) return "A2";

  const listed = LOOKUP.get(w);
  if (listed) return listed;

  // Multi-word phrases: take hardest token.
  if (english.includes(" ") || english.includes("-")) {
    const parts = english
      .toLowerCase()
      .split(/[\s-]+/)
      .map((p) => p.replace(/[^a-z']/g, ""))
      .filter(Boolean);
    let hardest: CefrLevel = "A1";
    for (const part of parts) {
      const level = LOOKUP.get(part) ?? estimateCefrHeuristic(part);
      if (CEFR_ORDER.indexOf(level) > CEFR_ORDER.indexOf(hardest)) hardest = level;
    }
    return hardest;
  }

  const letters = w.replace(/[^a-z]/g, "");
  const len = letters.length;
  const rare = (letters.match(/[jqxz]/g) || []).length;
  const suffixHard =
    /(tion|sion|ment|ance|ence|ology|ography|escence|itude|acious|iferous)$/.test(letters);
  const academic =
    /(psycho|socio|bio|geo|meta|hyper|inter|trans|counter|crypto|neuro)/.test(letters);

  let score = 0;
  if (len <= 3) score += 0;
  else if (len <= 5) score += 1;
  else if (len <= 7) score += 2;
  else if (len <= 9) score += 3;
  else if (len <= 12) score += 4;
  else score += 5;

  score += Math.min(2, rare);
  if (suffixHard) score += 1;
  if (academic) score += 1;
  if (w.includes("'")) score += 0;

  if (score <= 1) return "A2";
  if (score === 2) return "B1";
  if (score === 3) return "B2";
  if (score === 4) return "C1";
  return "C2";
}

async function detectCefrWithGemini(english: string): Promise<CefrLevel | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const result = await model.generateContent(
      `Classify the CEFR level of this English vocabulary word for language learners.
Word: "${english}"
Reply with ONLY one token: A1, A2, B1, B2, C1, or C2.`
    );
    return parseCefr(result.response.text());
  } catch {
    return null;
  }
}

/** Client-safe: curated list + heuristic (no Gemini). */
export function detectWordLevelSync(english: string): {
  cefr: CefrLevel;
  difficulty: 1 | 2 | 3 | 4 | 5;
  source: "list" | "heuristic";
} {
  const key = english.trim().toLowerCase().replace(/[^a-z\s'-]/g, "").replace(/\s+/g, " ");
  const listed = LOOKUP.get(key) ?? LOOKUP.get(key.replace(/[^a-z'-]/g, ""));
  if (listed) {
    return { cefr: listed, difficulty: cefrToDifficulty(listed), source: "list" };
  }
  const cefr = estimateCefrHeuristic(english);
  return { cefr, difficulty: cefrToDifficulty(cefr), source: "heuristic" };
}

export function isListedEnglishWord(english: string): boolean {
  const key = english.trim().toLowerCase().replace(/[^a-z'-]/g, "");
  return LOOKUP.has(key);
}

/** Mid-frequency pool for games when the user has few saved words. */
export function sampleListedWords(count: number, seed = Date.now()): string[] {
  const pool = [...CEFR_LISTS.A2, ...CEFR_LISTS.B1, ...CEFR_LISTS.B2].filter(
    (w) => w.length >= 4 && !w.includes(" ")
  );
  const copy = [...pool];
  let s = seed % 2147483647;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, count));
}

export async function detectWordLevel(english: string): Promise<{
  cefr: CefrLevel;
  difficulty: 1 | 2 | 3 | 4 | 5;
  source: "list" | "gemini" | "heuristic";
}> {
  const sync = detectWordLevelSync(english);
  if (sync.source === "list") return sync;

  const fromGemini = await detectCefrWithGemini(english);
  if (fromGemini) {
    return {
      cefr: fromGemini,
      difficulty: cefrToDifficulty(fromGemini),
      source: "gemini",
    };
  }

  return sync;
}
