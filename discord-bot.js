const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const APIFY_TOKEN = process.env.APIFY_TOKEN;

if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN eksik");
}

if (!APIFY_TOKEN) {
  throw new Error("APIFY_TOKEN eksik");
}

const sessions = new Map();

/*
 * ÖNEMLİ:
 *
 * Kullanıcının bütçesi en fazla 15.000 TL aşılabilir.
 *
 * Örnek:
 * 70.000 TL -> maksimum 85.000 TL
 * 80.000 TL -> maksimum 95.000 TL
 *
 * 85.001 TL -> RED
 */

const MAX_EXTRA_BUDGET = 15000;


/* =========================================================
   OYUNLAR
========================================================= */

const GAMES = {
  valorant: {
    name: "VALORANT",
    cpuWeight: 1.25,
    gpuWeight: 0.80
  },

  cs2: {
    name: "CS2",
    cpuWeight: 1.20,
    gpuWeight: 0.90
  },

  minecraft: {
    name: "Minecraft",
    cpuWeight: 1.15,
    gpuWeight: 0.90
  },

  fortnite: {
    name: "Fortnite",
    cpuWeight: 1.00,
    gpuWeight: 1.05
  },

  gta5: {
    name: "GTA V",
    cpuWeight: 0.95,
    gpuWeight: 1.10
  },

  rdr2: {
    name: "Red Dead Redemption 2",
    cpuWeight: 0.90,
    gpuWeight: 1.25
  },

  fc: {
    name: "EA SPORTS FC",
    cpuWeight: 1.00,
    gpuWeight: 1.00
  },

  cyberpunk: {
    name: "Cyberpunk 2077",
    cpuWeight: 0.85,
    gpuWeight: 1.40
  }
};


/* =========================================================
   CPU ADAYLARI
========================================================= */

const CPU = {
  amd: [
    {
      name: "Ryzen 5 5500",
      query: "AMD Ryzen 5 5500",
      tier: 1
    },
    {
      name: "Ryzen 5 5600",
      query: "AMD Ryzen 5 5600",
      tier: 2
    },
    {
      name: "Ryzen 5 7500F",
      query: "AMD Ryzen 5 7500F",
      tier: 3
    },
    {
      name: "Ryzen 5 7600",
      query: "AMD Ryzen 5 7600",
      tier: 4
    },
    {
      name: "Ryzen 7 7700",
      query: "AMD Ryzen 7 7700",
      tier: 4
    },
    {
      name: "Ryzen 7 7800X3D",
      query: "AMD Ryzen 7 7800X3D",
      tier: 5
    }
  ],

  intel: [
    {
      name: "Intel Core i3-12100F",
      query: "Intel Core i3 12100F",
      tier: 1
    },
    {
      name: "Intel Core i5-12400F",
      query: "Intel Core i5 12400F",
      tier: 2
    },
    {
      name: "Intel Core i5-13400F",
      query: "Intel Core i5 13400F",
      tier: 3
    },
    {
      name: "Intel Core i5-14400F",
      query: "Intel Core i5 14400F",
      tier: 4
    },
    {
      name: "Intel Core i5-14600KF",
      query: "Intel Core i5 14600KF",
      tier: 5
    },
    {
      name: "Intel Core i7-14700F",
      query: "Intel Core i7 14700F",
      tier: 5
    }
  ]
};


/* =========================================================
   GPU ADAYLARI
========================================================= */

const GPU = {
  nvidia: [
    {
      name: "RTX 3050 8GB",
      query: "RTX 3050 8GB",
      tier: 1
    },
    {
      name: "RTX 4060 8GB",
      query: "RTX 4060 8GB",
      tier: 2
    },
    {
      name: "RTX 5060 8GB",
      query: "RTX 5060 8GB",
      tier: 3
    },
    {
      name: "RTX 5060 Ti 8GB",
      query: "RTX 5060 Ti 8GB",
      tier: 4
    },
    {
      name: "RTX 5060 Ti 16GB",
      query: "RTX 5060 Ti 16GB",
      tier: 4
    },
    {
      name: "RTX 5070 12GB",
      query: "RTX 5070 12GB",
      tier: 5
    },
    {
      name: "RTX 5070 Ti 16GB",
      query: "RTX 5070 Ti 16GB",
      tier: 6
    },
    {
      name: "RTX 5080 16GB",
      query: "RTX 5080 16GB",
      tier: 7
    }
  ],

  amd: [
    {
      name: "RX 6600 8GB",
      query: "RX 6600 8GB",
      tier: 1
    },
    {
      name: "RX 7600 8GB",
      query: "RX 7600 8GB",
      tier: 2
    },
    {
      name: "RX 9060 XT 8GB",
      query: "RX 9060 XT 8GB",
      tier: 3
    },
    {
      name: "RX 9060 XT 16GB",
      query: "RX 9060 XT 16GB",
      tier: 4
    },
    {
      name: "RX 7700 XT 12GB",
      query: "RX 7700 XT 12GB",
      tier: 4
    },
    {
      name: "RX 7800 XT 16GB",
      query: "RX 7800 XT 16GB",
      tier: 5
    },
    {
      name: "RX 9070 XT 16GB",
      query: "RX 9070 XT 16GB",
      tier: 6
    },
    {
      name: "RX 7900 XTX 24GB",
      query: "RX 7900 XTX 24GB",
      tier: 7
    }
  ]
};


/* =========================================================
   YARDIMCI FONKSİYONLAR
========================================================= */

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}


function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}


/*
 * Apify'nin GERÇEK alanları:
 *
 * productName
 * brandName
 * sellerName
 * price
 * productUrl
 */

function getTitle(product) {
  return (
    product.productName ||
    product.title ||
    product.name ||
    ""
  );
}


function getPrice(product) {
  const value = product.price;

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const number = Number(cleaned);

    if (
      Number.isFinite(number) &&
      number > 0
    ) {
      return number;
    }
  }

  return null;
}


function getUrl(product) {
  return (
    product.productUrl ||
    product.url ||
    product.link ||
    null
  );
}


function getBrand(product) {
  return (
    product.brandName ||
    product.brand ||
    product.merchantName ||
    product.sellerName ||
    "Trendyol"
  );
}


/* =========================================================
   APIFY
========================================================= */

async function apifySearch(searchQueries) {

  if (
    !Array.isArray(searchQueries) ||
    searchQueries.length === 0
  ) {
    return [];
  }

  /*
   * Aynı sorguları tekrar gönderme.
   */

  const uniqueQueries = [
    ...new Set(
      searchQueries
        .map(q => String(q).trim())
        .filter(Boolean)
    )
  ];

  console.log(
    "🔎 Apify sorguları:",
    uniqueQueries
  );


  /*
   * MALİYETİ DÜŞÜRMEK İÇİN:
   *
   * Her sorgudan yalnızca 5 ürün.
   *
   * 10 sorgu x 5 ürün = en fazla 50 ürün.
   */

  const input = {
    searchQueries: uniqueQueries,

    startUrls: [],

    maxProductsPerSource: 5,

    includeReviews: false,

    maxReviewsPerProduct: 0,

    sort: "price_asc",

    minRating: "any",

    freeShippingOnly: false,

    fastDeliveryOnly: false,

    discountedOnly: false,

    country: "tr"
  };


  /*
   * 90 saniye timeout.
   *
   * Actor takılırsa bot sonsuza kadar beklemez.
   */

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      90000
    );


  try {

    const response =
      await fetch(
        "https://api.apify.com/v2/acts/solidcode~trendyol-scraper/run-sync-get-dataset-items",
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${APIFY_TOKEN}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(input),

          signal:
            controller.signal
        }
      );


    const text =
      await response.text();


    if (!response.ok) {
      throw new Error(
        `Apify ${response.status}: ${text.slice(0, 500)}`
      );
    }


    let data;

    try {
      data =
        JSON.parse(text);
    } catch {
      throw new Error(
        `Apify JSON hatası: ${text.slice(0, 500)}`
      );
    }


    if (!Array.isArray(data)) {
      throw new Error(
        "Apify ürün listesi döndürmedi."
      );
    }


    /*
     * Sadece ürün kayıtlarını al.
     */

    return data.filter(
      item =>
        item &&
        (
          !item.recordType ||
          item.recordType === "product"
        )
    );

  } catch (error) {

    if (
      error.name ===
      "AbortError"
    ) {
      throw new Error(
        "Apify 90 saniye içinde cevap vermedi."
      );
    }

    throw error;

  } finally {

    clearTimeout(
      timeout
    );
  }
}


/* =========================================================
   ÜRÜN FİLTRELERİ
========================================================= */

function validProduct(
  title,
  type
) {

  const t =
    normalize(title);


  if (!t) {
    return false;
  }


  /* CPU */

  if (type === "cpu") {

    const isCPU =
      t.includes("ryzen") ||
      t.includes("core i") ||
      t.includes("core ultra");


    if (!isCPU) {
      return false;
    }


    /*
     * İşlemci soğutucularını ele.
     */

    const fakeCPU =
      t.includes("sogutucu") ||
      t.includes("cooler") ||
      t.includes("fan") ||
      t.includes("termal macun") ||
      t.includes("termal") ||
      t.includes("wraith stealth") ||
      t.includes("wraith prism") ||
      t.includes("wraith spire");


    if (fakeCPU) {
      return false;
    }


    /*
     * Laptop işlemcilerini ele.
     */

    if (
      t.includes("laptop") ||
      t.includes("notebook")
    ) {
      return false;
    }


    return true;
  }


  /* GPU */

  if (type === "gpu") {

    const isGPU =
      t.includes("rtx ") ||
      t.includes("rtx") ||
      t.includes("rx ") ||
      t.includes("radeon") ||
      t.includes("geforce");


    if (!isGPU) {
      return false;
    }


    if (
      t.includes("laptop") ||
      t.includes("notebook") ||
      t.includes("harici ekran") ||
      t.includes("egpu") ||
      t.includes("kablo") ||
      t.includes("stand") ||
      t.includes("sogutucu")
    ) {
      return false;
    }


    return true;
  }


  /* RAM */

  if (type === "ram") {

    const memory =
      t.includes("ddr4") ||
      t.includes("ddr5");


    if (!memory) {
      return false;
    }


    if (
      t.includes("laptop") ||
      t.includes("notebook") ||
      t.includes("sodimm") ||
      t.includes("server")
    ) {
      return false;
    }


    /*
     * En az 16 GB.
     */

    const has16 =
      t.includes("16gb") ||
      t.includes("32gb") ||
      t.includes("64gb");


    return has16;
  }


  /* SSD */

  if (type === "ssd") {

    const isSSD =
      t.includes("nvme") ||
      t.includes("m.2") ||
      t.includes("m2");


    if (!isSSD) {
      return false;
    }


    if (
      t.includes("kutu") ||
      t.includes("adaptör") ||
      t.includes("adapter") ||
      t.includes("enclosure")
    ) {
      return false;
    }


    /*
     * 256 GB ve altını alma.
     */

    if (
      t.includes("120gb") ||
      t.includes("128gb") ||
      t.includes("240gb") ||
      t.includes("256gb")
    ) {
      return false;
    }


    return true;
  }


  /* ANAKART */

  if (type === "motherboard") {

    return (
      t.includes("anakart") ||
      t.includes("motherboard") ||
      t.includes("b450") ||
      t.includes("b550") ||
      t.includes("a520") ||
      t.includes("a620") ||
      t.includes("b650") ||
      t.includes("b760") ||
      t.includes("b850") ||
      t.includes("b860") ||
      t.includes("z690") ||
      t.includes("z790") ||
      t.includes("z890") ||
      t.includes("x670") ||
      t.includes("x870")
    );
  }


  /* PSU */

  if (type === "psu") {

    const isPSU =
      t.includes("psu") ||
      t.includes("power supply") ||
      t.includes("guc kaynagi") ||
      t.includes("güç kaynağı");


    if (!isPSU) {
      return false;
    }


    if (
      t.includes("adaptör") ||
      t.includes("adapter") ||
      t.includes("laptop") ||
      t.includes("notebook") ||
      t.includes("sarj")
    ) {
      return false;
    }


    return /\d{3,4}\s*w/.test(t);
  }


  /* KASA */

  if (type === "case") {

    const isCase =
      t.includes("pc kas") ||
      t.includes("bilgisayar kas") ||
      t.includes("gaming case") ||
      t.includes("atx kasa") ||
      t.includes("matx kasa") ||
      t.includes("mid tower") ||
      t.includes("full tower");


    if (!isCase) {
      return false;
    }


    /*
     * Sadece fan satılan ürünleri alma.
     */

    if (
      t.includes("fan 1 adet") ||
      t.includes("120mm fan") ||
      t.includes("140mm fan") ||
      t.includes("kasa ici fan")
    ) {
      return false;
    }


    return true;
  }


  return true;
}


/* =========================================================
   ÜRÜNLERİ TEMİZLE
========================================================= */

function cleanProducts(
  products,
  type
) {

  return products
    .map(product => ({

      title:
        getTitle(product),

      price:
        getPrice(product),

      url:
        getUrl(product),

      brand:
        getBrand(product),

      rating:
        product.rating ||
        null

    }))

    .filter(product => {

      return (
        product.price !== null &&
        product.price > 0 &&
        validProduct(
          product.title,
          type
        )
      );

    })

    .sort(
      (a, b) =>
        a.price -
        b.price
    );
}


/* =========================================================
   CPU PLATFORMU
========================================================= */

function platformForCPU(
  cpu
) {

  const t =
    normalize(cpu);


  if (
    t.includes("7500f") ||
    t.includes("7600") ||
    t.includes("7700") ||
    t.includes("7800x3d")
  ) {
    return "am5";
  }


  if (
    t.includes("5500") ||
    t.includes("5600")
  ) {
    return "am4";
  }


  return "lga1700";
}


/* =========================================================
   OYUN TIER
========================================================= */

function targetTier(
  budget,
  game
) {

  const profile =
    GAMES[game];


  let tier;


  if (budget < 35000) {
    tier = 1;
  } else if (budget < 50000) {
    tier = 2;
  } else if (budget < 65000) {
    tier = 3;
  } else if (budget < 80000) {
    tier = 4;
  } else if (budget < 110000) {
    tier = 5;
  } else if (budget < 150000) {
    tier = 6;
  } else {
    tier = 7;
  }


  if (
    profile.gpuWeight >= 1.25
  ) {
    tier += 0.5;
  }


  if (
    profile.cpuWeight >= 1.20
  ) {
    tier += 0.25;
  }


  return Math.max(
    1,
    Math.min(
      7,
      tier
    )
  );
}


/* =========================================================
   CPU ÜRÜNÜ HANGİ ADAY?
========================================================= */

function findCPUInfo(
  title,
  candidates
) {

  const t =
    normalize(title);


  return candidates.find(
    candidate => {

      const c =
        normalize(
          candidate.name
        );


      /*
       * Örn:
       * Ryzen 5 7500F
       * Ryzen 5 7500F 3.7GHz
       */

      return t.includes(c);
    }
  );
}


/* =========================================================
   GPU ÜRÜNÜ HANGİ ADAY?
========================================================= */

function findGPUInfo(
  title,
  candidates
) {

  const t =
    normalize(title);


  return candidates.find(
    candidate => {

      const c =
        normalize(
          candidate.name
        );


      return t.includes(c);
    }
  );
}


/* =========================================================
   RAM UYUMLULUĞU
========================================================= */

function compatibleRAM(
  platform,
  product
) {

  const t =
    normalize(
      product.title
    );


  if (
    platform === "am4"
  ) {
    return t.includes("ddr4");
  }


  return t.includes("ddr5");
}


/* =========================================================
   RAM KAPASİTESİ
========================================================= */

function ramCapacity(
  product
) {

  const t =
    normalize(
      product.title
    );


  if (t.includes("64gb")) {
    return 64;
  }

  if (t.includes("32gb")) {
    return 32;
  }

  if (t.includes("16gb")) {
    return 16;
  }

  return 0;
}


/* =========================================================
   ANAKART UYUMLULUĞU
========================================================= */

function compatibleMotherboard(
  platform,
  product
) {

  const t =
    normalize(
      product.title
    );


  if (
    platform === "am4"
  ) {

    return (
      t.includes("b450") ||
      t.includes("b550") ||
      t.includes("a520")
    );
  }


  if (
    platform === "am5"
  ) {

    return (
      t.includes("a620") ||
      t.includes("b650") ||
      t.includes("b850") ||
      t.includes("x670") ||
      t.includes("x870")
    );
  }


  return (
    t.includes("b660") ||
    t.includes("b760") ||
    t.includes("b860") ||
    t.includes("z690") ||
    t.includes("z790") ||
    t.includes("z890")
  );
}


/* =========================================================
   PSU WATT
========================================================= */

function getPSUWatts(
  product
) {

  const t =
    normalize(
      product.title
    );


  const match =
    t.match(
      /(\d{3,4})\s*w/
    );


  if (!match) {
    return 0;
  }


  return Number(
    match[1]
  );
}


/* =========================================================
   GEREKLİ PSU
========================================================= */

function requiredPSU(
  gpu
) {

  const t =
    normalize(
      gpu.title
    );


  if (
    t.includes("5080") ||
    t.includes("5070 ti") ||
    t.includes("7900 xtx")
  ) {
    return 850;
  }


  if (
    t.includes("5070") ||
    t.includes("9070")
  ) {
    return 750;
  }


  return 650;
}


/* =========================================================
   EN UCUZ ÜRÜN
========================================================= */

function cheapest(
  products,
  filter = () => true
) {

  return (
    products
      .filter(filter)
      .sort(
        (a, b) =>
          a.price -
          b.price
      )[0] ||
    null
  );
}


/* =========================================================
   SİSTEM OLUŞTUR
========================================================= */

async function makeBuild(
  session
) {

  const budget =
    Number(
      session.budget
    );


  const maximum =
    budget +
    MAX_EXTRA_BUDGET;


  const wantedTier =
    targetTier(
      budget,
      session.game
    );


  /*
   * Sadece 2 CPU + 2 GPU adayını arıyoruz.
   *
   * Bu, eski sistemdeki 20+ aramayı ciddi
   * şekilde azaltır.
   */

  const cpuCandidates =
    [...CPU[session.cpu]]
      .sort(
        (a, b) =>
          Math.abs(
            a.tier -
            wantedTier
          ) -
          Math.abs(
            b.tier -
            wantedTier
          )
      )
      .slice(0, 2);


  const gpuCandidates =
    [...GPU[session.gpu]]
      .sort(
        (a, b) =>
          Math.abs(
            a.tier -
            wantedTier
          ) -
          Math.abs(
            b.tier -
            wantedTier
          )
      )
      .slice(0, 2);


  /*
   * Toplam:
   *
   * 2 CPU
   * 2 GPU
   * 2 RAM
   * 2 SSD
   * 3 anakart
   * 3 PSU
   * 1 kasa
   *
   * = 15 sorgu civarı.
   *
   * Her sorgudan maksimum 5 ürün.
   */

  const queries = [];


  for (
    const cpu of cpuCandidates
  ) {
    queries.push(
      cpu.query
    );
  }


  for (
    const gpu of gpuCandidates
  ) {
    queries.push(
      gpu.query
    );
  }


  /*
   * RAM.
   */

  queries.push(
    "16GB DDR4 RAM",
    "32GB DDR5 RAM"
  );


  /*
   * SSD.
   */

  queries.push(
    "500GB NVMe SSD",
    "1TB NVMe SSD"
  );


  /*
   * Anakart.
   */

  queries.push(
    "B550 DDR4 anakart",
    "B650 DDR5 anakart",
    "B760 DDR5 anakart"
  );


  /*
   * PSU.
   */

  queries.push(
    "650W PSU",
    "750W PSU",
    "850W PSU"
  );


  /*
   * Kasa.
   */

  queries.push(
    "ATX Gaming Kasa"
  );


  const rawProducts =
    await apifySearch(
      queries
    );


  console.log(
    `📦 Apify ${rawProducts.length} ürün döndürdü.`
  );


  /*
   * Türlerine ayır.
   */

  const allCPU =
    cleanProducts(
      rawProducts,
      "cpu"
    );


  const allGPU =
    cleanProducts(
      rawProducts,
      "gpu"
    );


  const allRAM =
    cleanProducts(
      rawProducts,
      "ram"
    );


  const allSSD =
    cleanProducts(
      rawProducts,
      "ssd"
    );


  const allMotherboard =
    cleanProducts(
      rawProducts,
      "motherboard"
    );


  const allPSU =
    cleanProducts(
      rawProducts,
      "psu"
    );


  const allCase =
    cleanProducts(
      rawProducts,
      "case"
    );


  console.log(
    "🧠 CPU:",
    allCPU.length,
    "🎮 GPU:",
    allGPU.length,
    "🧩 RAM:",
    allRAM.length,
    "💾 SSD:",
    allSSD.length,
    "🔧 Anakart:",
    allMotherboard.length,
    "⚡ PSU:",
    allPSU.length,
    "📦 Kasa:",
    allCase.length
  );


  /*
   * Sadece seçilen marka.
   */

  const wantedCPU =
    allCPU.filter(
      product => {

        const t =
          normalize(
            product.title
          );


        if (
          session.cpu === "amd"
        ) {
          return t.includes("ryzen");
        }


        return (
          t.includes("core i") ||
          t.includes("core ultra")
        );
      }
    );


  const wantedGPU =
    allGPU.filter(
      product => {

        const t =
          normalize(
            product.title
          );


        if (
          session.gpu === "nvidia"
        ) {
          return (
            t.includes("rtx") ||
            t.includes("geforce")
          );
        }


        return (
          t.includes("rx ") ||
          t.includes("radeon")
        );
      }
    );


  /*
   * CPU/GPU kombinasyonlarını oluştur.
   */

  const combinations = [];


  for (
    const cpuProduct
    of wantedCPU
  ) {

    const cpuInfo =
      findCPUInfo(
        cpuProduct.title,
        cpuCandidates
      );


    if (!cpuInfo) {
      continue;
    }


    for (
      const gpuProduct
      of wantedGPU
    ) {

      const gpuInfo =
        findGPUInfo(
          gpuProduct.title,
          gpuCandidates
        );


      if (!gpuInfo) {
        continue;
      }


      combinations.push({

        cpu: {
          product:
            cpuProduct,

          info:
            cpuInfo
        },

        gpu: {
          product:
            gpuProduct,

          info:
            gpuInfo
        },

        score:
          Math.abs(
            cpuInfo.tier -
            wantedTier
          ) +
          Math.abs(
            gpuInfo.tier -
            wantedTier
          )

      });
    }
  }


  combinations.sort(
    (a, b) => {

      /*
       * Önce tier yakınlığı.
       * Eşitse daha ucuz olan.
       */

      if (
        a.score !==
        b.score
      ) {
        return (
          a.score -
          b.score
        );
      }


      return (
        (
          a.cpu.product.price +
          a.gpu.product.price
        ) -
        (
          b.cpu.product.price +
          b.gpu.product.price
        )
      );
    }
  );


  /*
   * En fazla 12 kombinasyon.
   */

  for (
    const combination
    of combinations.slice(
      0,
      12
    )
  ) {

    const cpu =
      combination.cpu.product;


    const gpu =
      combination.gpu.product;


    const platform =
      platformForCPU(
        combination.cpu.info.name
      );


    /*
     * RAM:
     *
     * Bütçeye göre 16/32 GB.
     *
     * AM4 -> DDR4
     * AM5/LGA1700 -> DDR5
     */

    const preferredRAM =
      budget >= 60000
        ? 32
        : 16;


    let ram =
      cheapest(
        allRAM,
        product => {

          if (
            !compatibleRAM(
              platform,
              product
            )
          ) {
            return false;
          }


          const capacity =
            ramCapacity(
              product
            );


          /*
           * Tercih edilen kapasiteyi
           * karşılıyorsa kabul et.
           */

          return (
            capacity >=
            preferredRAM
          );
        }
      );


    /*
     * Eğer 32 GB bulunamadıysa
     * 16 GB'a düş.
     */

    if (!ram) {

      ram =
        cheapest(
          allRAM,
          product =>
            compatibleRAM(
              platform,
              product
            ) &&
            ramCapacity(
              product
            ) >= 16
        );
    }


    /*
     * Anakart.
     */

    const motherboard =
      cheapest(
        allMotherboard,
        product =>
          compatibleMotherboard(
            platform,
            product
          )
      );


    /*
     * SSD.
     *
     * 60K+ -> 1TB tercih.
     */

    let ssd;

    if (
      budget >= 60000
    ) {

      ssd =
        cheapest(
          allSSD,
          product => {

            const t =
              normalize(
                product.title
              );


            return (
              t.includes("1tb") ||
              t.includes("1000gb")
            );
          }
        );
    }


    /*
     * 1TB bulunamadıysa
     * en az 500GB NVMe.
     */

    if (!ssd) {

      ssd =
        cheapest(
          allSSD,
          product => {

            const t =
              normalize(
                product.title
              );


            return (
              t.includes("500gb") ||
              t.includes("512gb") ||
              t.includes("1tb") ||
              t.includes("1000gb")
            );
          }
        );
    }


    /*
     * PSU.
     */

    const neededPSU =
      requiredPSU(
        gpu
      );


    const psu =
      cheapest(
        allPSU,
        product =>
          getPSUWatts(
            product
          ) >=
          neededPSU
      );


    /*
     * Kasa.
     */

    const pcCase =
      cheapest(
        allCase
      );


    /*
     * Eksik parça varsa
     * sonraki kombinasyona geç.
     */

    if (
      !cpu ||
      !gpu ||
      !ram ||
      !ssd ||
      !motherboard ||
      !psu ||
      !pcCase
    ) {
      continue;
    }


    const parts = [

      [
        "🧠 İşlemci",
        cpu
      ],

      [
        "🎮 Ekran Kartı",
        gpu
      ],

      [
        "🧩 RAM",
        ram
      ],

      [
        "💾 SSD",
        ssd
      ],

      [
        "🔧 Anakart",
        motherboard
      ],

      [
        "⚡ PSU",
        psu
      ],

      [
        "📦 Kasa",
        pcCase
      ]

    ];


    const total =
      parts.reduce(
        (
          sum,
          [, product]
        ) =>
          sum +
          product.price,
        0
      );


    /*
     * SERT BÜTÇE KİLİDİ.
     *
     * Asla +15K'dan fazla çıkamaz.
     */

    if (
      total >
      maximum
    ) {
      continue;
    }


    /*
     * Sistem bulundu.
     */

    return {

      parts,

      total,

      cpu:
        cpu.title,

      gpu:
        gpu.title,

      maximum

    };
  }


  return null;
}


/* =========================================================
   ANA PANEL
========================================================= */

function panel(
  session
) {

  const embed =
    new EmbedBuilder()
      .setColor(
        0x5865f2
      )
      .setTitle(
        "🖥️ PC TOPLA"
      )
      .setDescription(

        "Seçimlerini yap, sonra " +
        "**PC'Yİ OLUŞTUR** butonuna bas.\n\n" +

        `💰 **Bütçe:** ${
          session.budget
            ? money(
                session.budget
              )
            : "Seçilmedi"
        }\n` +

        `📈 **Maksimum:** ${
          session.budget
            ? money(
                session.budget +
                MAX_EXTRA_BUDGET
              )
            : "Bütçe + 15.000 TL"
        }\n` +

        `🎮 **Oyun:** ${
          session.game
            ? GAMES[
                session.game
              ].name
            : "Seçilmedi"
        }\n` +

        `🧠 **CPU:** ${
          session.cpu === "amd"
            ? "AMD"
            : "Intel"
        }\n` +

        `🎮 **GPU:** ${
          session.gpu === "nvidia"
            ? "NVIDIA"
            : "AMD"
        }`

      );


  const row1 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            "budget"
          )
          .setLabel(
            "💰 Bütçe"
          )
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "game"
          )
          .setLabel(
            "🎮 Oyun"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "cpu"
          )
          .setLabel(
            session.cpu === "amd"
              ? "🧠 AMD"
              : "🧠 Intel"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "gpu"
          )
          .setLabel(
            session.gpu === "nvidia"
              ? "🎮 NVIDIA"
              : "🎮 AMD"
          )
          .setStyle(
            ButtonStyle.Secondary
          )

      );


  const row2 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            "create"
          )
          .setLabel(
            "🚀 PC'Yİ OLUŞTUR"
          )
          .setStyle(
            ButtonStyle.Success
          )

      );


  return {

    embeds: [
      embed
    ],

    components: [
      row1,
      row2
    ]

  };
}


/* =========================================================
   SLASH COMMAND
========================================================= */

const commands = [

  new SlashCommandBuilder()
    .setName(
      "pctopla"
    )
    .setDescription(
      "Bütçene ve oyununa göre PC oluştur."
    )

].map(
  command =>
    command.toJSON()
);


const rest =
  new REST({
    version: "10"
  }).setToken(
    DISCORD_TOKEN
  );


/* =========================================================
   READY
========================================================= */

client.once(
  "ready",
  async () => {

    console.log(
      `🤖 Bot aktif: ${client.user.tag}`
    );


    try {

      await rest.put(
        Routes.applicationCommands(
          client.user.id
        ),
        {
          body: commands
        }
      );


      console.log(
        "✅ /pctopla hazır."
      );

    } catch (error) {

      console.error(
        "❌ Komut kayıt hatası:",
        error
      );

    }
  }
);


/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    try {

      /* =====================================================
         /pctopla
      ===================================================== */

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "pctopla"
      ) {

        const session = {

          budget: null,

          game: null,

          cpu: "amd",

          gpu: "nvidia"

        };


        sessions.set(
          interaction.user.id,
          session
        );


        await interaction.reply(
          panel(session)
        );


        return;
      }


      /* =====================================================
         BUTTON
      ===================================================== */

      if (
        interaction.isButton()
      ) {

        const session =
          sessions.get(
            interaction.user.id
          );


        if (!session) {

          await interaction.reply({

            content:
              "❌ Oturum bulunamadı. `/pctopla` ile yeniden başla.",

            ephemeral: true

          });

          return;
        }


        /* ===================================================
           BÜTÇE
        =================================================== */

        if (
          interaction.customId ===
          "budget"
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                "budget_modal"
              )
              .setTitle(
                "💰 Bütçeni Gir"
              );


          const input =
            new TextInputBuilder()
              .setCustomId(
                "budget_input"
              )
              .setLabel(
                "Maksimum bütçe (TL)"
              )
              .setPlaceholder(
                "Örn: 80000"
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(
                true
              );


          modal.addComponents(

            new ActionRowBuilder()
              .addComponents(
                input
              )

          );


          await interaction.showModal(
            modal
          );


          return;
        }


        /* ===================================================
           OYUN
        =================================================== */

        if (
          interaction.customId ===
          "game"
        ) {

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                "game_select"
              )
              .setPlaceholder(
                "🎮 Oyun seç"
              )
              .addOptions(

                Object.entries(
                  GAMES
                ).map(
                  ([value, game]) => ({

                    label:
                      game.name,

                    value,

                    emoji:
                      "🎮"

                  })
                )

              );


          await interaction.reply({

            content:
              "🎮 Oynayacağın oyunu seç:",

            components: [

              new ActionRowBuilder()
                .addComponents(
                  menu
                )

            ],

            ephemeral: true

          });


          return;
        }


        /* ===================================================
           CPU
        =================================================== */

        if (
          interaction.customId ===
          "cpu"
        ) {

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                "cpu_select"
              )
              .setPlaceholder(
                "🧠 CPU markası"
              )
              .addOptions(

                {
                  label:
                    "AMD",

                  value:
                    "amd",

                  emoji:
                    "🧠"
                },

                {
                  label:
                    "Intel",

                  value:
                    "intel",

                  emoji:
                    "🧠"
                }

              );


          await interaction.reply({

            content:
              "🧠 İşlemci markasını seç:",

            components: [

              new ActionRowBuilder()
                .addComponents(
                  menu
                )

            ],

            ephemeral: true

          });


          return;
        }


        /* ===================================================
           GPU
        =================================================== */

        if (
          interaction.customId ===
          "gpu"
        ) {

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                "gpu_select"
              )
              .setPlaceholder(
                "🎮 GPU markası"
              )
              .addOptions(

                {
                  label:
                    "NVIDIA",

                  value:
                    "nvidia",

                  emoji:
                    "🎮"
                },

                {
                  label:
                    "AMD",

                  value:
                    "amd",

                  emoji:
                    "🎮"
                }

              );


          await interaction.reply({

            content:
              "🎮 Ekran kartı markasını seç:",

            components: [

              new ActionRowBuilder()
                .addComponents(
                  menu
                )

            ],

            ephemeral: true

          });


          return;
        }


        /* ===================================================
           OLUŞTUR
        =================================================== */

        if (
          interaction.customId ===
          "create"
        ) {

          if (
            !session.budget
          ) {

            await interaction.reply({

              content:
                "💰 Önce bütçeni gir.",

              ephemeral: true

            });

            return;
          }


          if (
            !session.game
          ) {

            await interaction.reply({

              content:
                "🎮 Önce oyun seç.",

              ephemeral: true

            });

            return;
          }


          /*
           * Araştırma mesajı.
           */

          await interaction.update({

            embeds: [

              new EmbedBuilder()
                .setColor(
                  0xf1c40f
                )
                .setTitle(
                  "🔎 PC ARAŞTIRILIYOR..."
                )
                .setDescription(

                  `🎮 **Oyun:** ${
                    GAMES[
                      session.game
                    ].name
                  }\n` +

                  `💰 **Bütçe:** ${
                    money(
                      session.budget
                    )
                  }\n` +

                  `📈 **Maksimum:** ${
                    money(
                      session.budget +
                      MAX_EXTRA_BUDGET
                    )
                  }\n\n` +

                  "🛒 Canlı Trendyol fiyatları taranıyor...\n" +
                  "🧠 İşlemci seçiliyor...\n" +
                  "🎮 Ekran kartı seçiliyor...\n" +
                  "🔧 Uyumluluk kontrol ediliyor...\n" +
                  "💰 Son bütçe kontrolü yapılıyor..."

                )

            ],

            components: []

          });


          let result;


          try {

            result =
              await makeBuild(
                session
              );

          } catch (error) {

            console.error(
              "❌ BUILD ERROR:",
              error
            );


            await interaction.editReply({

              embeds: [

                new EmbedBuilder()
                  .setColor(
                    0xed4245
                  )
                  .setTitle(
                    "❌ FİYAT ARAMASINDA HATA"
                  )
                  .setDescription(

                    "Canlı ürün verisi alınırken bir hata oluştu.\n\n" +

                    `📌 **Hata:** ${
                      String(
                        error.message
                      ).slice(
                        0,
                        500
                      )
                    }\n\n` +

                    "🔄 Birkaç saniye sonra tekrar deneyebilirsin."

                  )

              ],

              components: []

            });


            return;
          }


          /*
           * Sistem bulunamadı.
           */

          if (!result) {

            await interaction.editReply({

              embeds: [

                new EmbedBuilder()
                  .setColor(
                    0xed4245
                  )
                  .setTitle(
                    "❌ UYGUN SİSTEM BULUNAMADI"
                  )
                  .setDescription(

                    "Canlı fiyatlarda bütün parçaları uyumlu ve bütçe sınırında olan bir sistem bulamadım.\n\n" +

                    `💰 **Bütçe:** ${
                      money(
                        session.budget
                      )
                    }\n` +

                    `📈 **İzin verilen maksimum:** ${
                      money(
                        session.budget +
                        MAX_EXTRA_BUDGET
                      )
                    }\n\n` +

                    "💡 CPU/GPU markasını veya bütçeyi değiştirmeyi deneyebilirsin."

                  )

              ],

              components: []

            });


            return;
          }


          const over =
            result.total >
            session.budget;


          const difference =
            Math.abs(
              result.total -
              session.budget
            );


          const embed =
            new EmbedBuilder()
              .setColor(
                over
                  ? 0xf1c40f
                  : 0x57f287
              )
              .setTitle(
                "🚀 PC HAZIR!"
              )
              .setDescription(

                `🎮 **Oyun:** ${
                  GAMES[
                    session.game
                  ].name
                }\n` +

                `🧠 **CPU tercihi:** ${
                  session.cpu === "amd"
                    ? "AMD"
                    : "Intel"
                }\n` +

                `🎮 **GPU tercihi:** ${
                  session.gpu === "nvidia"
                    ? "NVIDIA"
                    : "AMD"
                }\n\n` +

                `💰 **Bütçe:** ${
                  money(
                    session.budget
                  )
                }\n` +

                `📈 **İzin verilen maksimum:** ${
                  money(
                    result.maximum
                  )
                }\n` +

                `💵 **Toplam:** ${
                  money(
                    result.total
                  )
                }\n\n` +

                (
                  over

                    ? `🟡 Bütçenin **${money(
                        difference
                      )}** üzerinde`

                    : `🟢 Bütçenin **${money(
                        difference
                      )}** altında`
                )

              );


          for (
            const [
              name,
              product
            ]
            of result.parts
          ) {

            embed.addFields({

              name,

              value:

                `**${
                  product.title
                }**\n` +

                `💰 ${
                  money(
                    product.price
                  )
                }\n` +

                `🏪 ${
                  product.brand
                }\n` +

                (
                  product.url

                    ? `[🛒 Ürüne git](${
                        product.url
                      })`

                    : "🔗 Link bulunamadı"
                ),

              inline:
                false

            });

          }


          /*
           * Botun oturumunu temizle.
           */

          sessions.delete(
            interaction.user.id
          );


          await interaction.editReply({

            embeds: [
              embed
            ],

            components: []

          });


          return;
        }
      }


      /* =====================================================
         SELECT MENÜ
      ===================================================== */

      if (
        interaction.isStringSelectMenu()
      ) {

        const session =
          sessions.get(
            interaction.user.id
          );


        if (!session) {

          await interaction.reply({

            content:
              "❌ Oturum bulunamadı. `/pctopla` ile yeniden başla.",

            ephemeral: true

          });

          return;
        }


        /* OYUN */

        if (
          interaction.customId ===
          "game_select"
        ) {

          session.game =
            interaction.values[0];


          await interaction.update({

            content:
              `✅ Oyun seçildi: **${
                GAMES[
                  session.game
                ].name
              }**`,

            components: []

          });


          return;
        }


        /* CPU */

        if (
          interaction.customId ===
          "cpu_select"
        ) {

          session.cpu =
            interaction.values[0];


          await interaction.update({

            content:
              `✅ CPU seçildi: **${
                session.cpu === "amd"
                  ? "AMD"
                  : "Intel"
              }**`,

            components: []

          });


          return;
        }


        /* GPU */

        if (
          interaction.customId ===
          "gpu_select"
        ) {

          session.gpu =
            interaction.values[0];


          await interaction.update({

            content:
              `✅ GPU seçildi: **${
                session.gpu === "nvidia"
                  ? "NVIDIA"
                  : "AMD"
              }**`,

            components: []

          });


          return;
        }
      }


      /* =====================================================
         MODAL
      ===================================================== */

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          "budget_modal"
      ) {

        const session =
          sessions.get(
            interaction.user.id
          );


        if (!session) {

          await interaction.reply({

            content:
              "❌ Oturum bulunamadı. `/pctopla` ile yeniden başla.",

            ephemeral: true

          });

          return;
        }


        const raw =
          interaction.fields
            .getTextInputValue(
              "budget_input"
            );


        /*
         * Sadece rakamları al.
         *
         * 80.000 TL
         * 80000
         * 80,000
         *
         * hepsi 80000 olur.
         */

        const budget =
          Number(
            raw.replace(
              /\D/g,
              ""
            )
          );


        if (
          !Number.isFinite(
            budget
          ) ||
          budget < 10000 ||
          budget > 500000
        ) {

          await interaction.reply({

            content:
              "❌ Bütçe 10.000 - 500.000 TL arasında olmalı.",

            ephemeral:
              true

          });

          return;
        }


        session.budget =
          Math.floor(
            budget
          );


        await interaction.reply({

          content:

            `✅ **Bütçe:** ${
              money(
                session.budget
              )
            }\n` +

            `📈 **İzin verilen maksimum:** ${
              money(
                session.budget +
                MAX_EXTRA_BUDGET
              )
            }`,

          ephemeral:
            true

        });


        return;
      }

    } catch (error) {

      console.error(
        "❌ INTERACTION ERROR:",
        error
      );


      try {

        if (
          interaction.replied ||
          interaction.deferred
        ) {

          await interaction.followUp({

            content:
              `❌ Bir hata oluştu: ${
                String(
                  error.message
                ).slice(
                  0,
                  300
                )
              }`,

            ephemeral:
              true

          });

        } else {

          await interaction.reply({

            content:
              `❌ Bir hata oluştu: ${
                String(
                  error.message
                ).slice(
                  0,
                  300
                )
              }`,

            ephemeral:
              true

          });

        }

      } catch {}

    }
  }
);


/* =========================================================
   LOGIN
========================================================= */

client.login(
  DISCORD_TOKEN
);