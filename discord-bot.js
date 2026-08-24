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
   CPU
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
   GPU
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
   YARDIMCILAR
========================================================= */

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function getTitle(product) {
  return (
    product.title ||
    product.name ||
    product.productName ||
    ""
  );
}

function getPrice(product) {
  const values = [
    product.price,
    product.salePrice,
    product.discountedPrice,
    product.currentPrice,
    product.sellingPrice
  ];

  for (const value of values) {
    if (
      typeof value === "number" &&
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
  }

  return null;
}

function getUrl(product) {
  return (
    product.url ||
    product.productUrl ||
    product.link ||
    product.productLink ||
    null
  );
}


/* =========================================================
   APIFY
   TEK ACTOR ÇALIŞTIRIP BİRDEN FAZLA ÜRÜNÜ TEK SEFERDE ARA
========================================================= */

async function apifySearch(searchQueries) {

  const input = {
    searchQueries,
    startUrls: [],

    /*
     * Tasarruf:
     * Her arama için yalnızca 8 ürün.
     */
    maxProductsPerSource: 8,

    /*
     * Fiyat düşükten yükseğe.
     */
    sort: "price_asc",

    /*
     * Yorumları kesinlikle çekme.
     */
    includeReviews: false,

    maxReviewsPerProduct: 0,

    country: "tr",

    minRating: "any",

    freeShippingOnly: false,

    fastDeliveryOnly: false,

    discountedOnly: false
  };

  const response = await fetch(
    "https://api.apify.com/v2/acts/solidcode~trendyol-scraper/run-sync-get-dataset-items",
    {
      method: "POST",

      headers: {
        "Authorization":
          `Bearer ${APIFY_TOKEN}`,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify(input)
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
    data = JSON.parse(text);
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

  return data.filter(
    item =>
      !item.recordType ||
      item.recordType === "product"
  );
}


/* =========================================================
   ÜRÜN FİLTRESİ
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


  if (type === "cpu") {

    if (
      !t.includes("ryzen") &&
      !t.includes("core i") &&
      !t.includes("core ultra")
    ) {
      return false;
    }

    if (
      t.includes("sogutucu") ||
      t.includes("cooler") ||
      t.includes("fan") ||
      t.includes("termal macun")
    ) {
      return false;
    }

    return true;
  }


  if (type === "gpu") {

    if (
      !t.includes("rtx ") &&
      !t.includes("rx ") &&
      !t.includes("geforce") &&
      !t.includes("radeon")
    ) {
      return false;
    }

    if (
      t.includes("laptop") ||
      t.includes("notebook") ||
      t.includes("kablo") ||
      t.includes("stand")
    ) {
      return false;
    }

    return true;
  }


  if (type === "ram") {

    return (
      (
        t.includes("ram") ||
        t.includes("ddr4") ||
        t.includes("ddr5")
      ) &&
      !t.includes("laptop") &&
      !t.includes("notebook") &&
      !t.includes("sodimm")
    );
  }


  if (type === "ssd") {

    if (
      !t.includes("ssd") &&
      !t.includes("nvme")
    ) {
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
      t.includes("z790") ||
      t.includes("z890")
    );
  }


  if (type === "psu") {

    return (
      t.includes("psu") ||
      t.includes("power supply") ||
      t.includes("guc kaynagi")
    );
  }


  if (type === "case") {

    if (
      !t.includes("kasa") &&
      !t.includes("pc case") &&
      !t.includes("gaming case")
    ) {
      return false;
    }

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
   ÜRÜN DÖNÜŞTÜR
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
        product.brand ||
        product.merchantName ||
        product.sellerName ||
        "Trendyol",

      rating:
        product.rating ||
        null
    }))

    .filter(product =>
      product.price &&
      validProduct(
        product.title,
        type
      )
    )

    .sort(
      (a, b) =>
        a.price - b.price
    );
}


/* =========================================================
   PLATFORM
========================================================= */

function platformForCPU(cpu) {

  if (
    cpu.includes("7500F") ||
    cpu.includes("7600") ||
    cpu.includes("7700") ||
    cpu.includes("7800X3D")
  ) {
    return "am5";
  }

  if (
    cpu.includes("5500") ||
    cpu.includes("5600")
  ) {
    return "am4";
  }

  return "lga1700";
}


/* =========================================================
   TIER
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
   UYUMLULUK
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


function requiredPSU(gpu) {

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
   EN UCUZ UYGUN ÜRÜN
========================================================= */

function cheapest(
  products,
  maxPrice = Infinity
) {

  return (
    products
      .filter(
        product =>
          product.price <=
          maxPrice
      )
      .sort(
        (a, b) =>
          a.price - b.price
      )[0] ||
    null
  );
}


/* =========================================================
   PC OLUŞTUR
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
   * Bütçeye göre sadece gerekli CPU/GPU adaylarını
   * seçiyoruz.
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
      .slice(0, 4);


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
      .slice(0, 4);


  /*
   * TEK APIFY ÇAĞRISI.
   *
   * Bu çok önemli:
   * 7 farklı API çağrısı yerine
   * bütün aramaları tek Actor çalıştırmasında
   * gönderiyoruz.
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


  const cheapestCPU =
    Math.max(
      8000,
      Math.floor(
        maximum * 0.25
      )
    );


  /*
   * Genel parça aramaları.
   */

  queries.push(
    "16GB DDR4 RAM",
    "32GB DDR5 RAM",
    "500GB NVMe SSD",
    "1TB NVMe SSD",
    "B550 anakart",
    "B650 anakart",
    "B760 anakart",
    "650W PSU",
    "750W PSU",
    "850W PSU",
    "ATX Gaming Kasa"
  );


  /*
   * Aynı sorguyu tekrar gönderme.
   */

  const uniqueQueries =
    [...new Set(
      queries
    )];


  console.log(
    "🔎 Apify sorguları:",
    uniqueQueries
  );


  let rawProducts;

  try {

    rawProducts =
      await apifySearch(
        uniqueQueries
      );

  } catch (error) {

    console.error(
      "Apify hatası:",
      error.message
    );

    return null;
  }


  /*
   * Arama sonuçlarını parça türlerine ayır.
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


  /*
   * Sadece istediğimiz CPU ailesindeki ürünleri kullan.
   */

  const wantedCPU =
    allCPU.filter(product => {

      const t =
        normalize(
          product.title
        );

      if (
        session.cpu === "amd"
      ) {
        return (
          t.includes("ryzen")
        );
      }

      return (
        t.includes("core i") ||
        t.includes("core ultra")
      );
    });


  /*
   * Sadece istediğimiz GPU ailesi.
   */

  const wantedGPU =
    allGPU.filter(product => {

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
    });


  /*
   * CPU/GPU aday kombinasyonları.
   */

  const combinations = [];


  for (
    const cpuProduct
    of wantedCPU
  ) {

    const cpuInfo =
      cpuCandidates.find(
        candidate =>
          normalize(
            cpuProduct.title
          ).includes(
            normalize(
              candidate.name
            )
          )
      );


    if (!cpuInfo) {
      continue;
    }


    for (
      const gpuProduct
      of wantedGPU
    ) {

      const gpuInfo =
        gpuCandidates.find(
          candidate =>
            normalize(
              gpuProduct.title
            ).includes(
              normalize(
                candidate.name
              )
            )
        );


      if (!gpuInfo) {
        continue;
      }


      combinations.push({

        cpu: {
          ...cpuProduct,
          info: cpuInfo
        },

        gpu: {
          ...gpuProduct,
          info: gpuInfo
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
    (a, b) =>
      a.score -
      b.score
  );


  /*
   * En fazla 12 CPU/GPU kombinasyonu deniyoruz.
   */

  for (
    const combination
    of combinations.slice(
      0,
      12
    )
  ) {

    const cpu =
      combination.cpu;

    const gpu =
      combination.gpu;


    const platform =
      platformForCPU(
        cpu.info.name
      );


    /*
     * Platforma uygun RAM.
     */

    const ram =
      allRAM.find(
        product =>
          compatibleRAM(
            platform,
            product
          )
      );


    /*
     * Platforma uygun anakart.
     */

    const motherboard =
      allMotherboard.find(
        product =>
          compatibleMotherboard(
            platform,
            product
          )
      );


    /*
     * SSD.
     */

    const wantedSSD =
      budget >= 60000
        ? allSSD.find(
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
          )
        : allSSD.find(
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


    /*
     * PSU.
     */

    const required =
      requiredPSU(
        gpu
      );


    const psu =
      allPSU.find(
        product => {

          const t =
            normalize(
              product.title
            );

          const match =
            t.match(
              /(\d{3,4})w/
            );

          if (!match) {
            return true;
          }

          return (
            Number(
              match[1]
            ) >= required
          );
        }
      );


    /*
     * Kasa.
     */

    const pcCase =
      allCase[0];


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
        wantedSSD
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
     * BÜTÇE KİLİDİ
     *
     * 80K -> maksimum 95K
     * 95.001 -> RED
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
   PANEL
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
    embeds: [embed],
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
        "Komut kayıt hatası:",
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

      /* /pctopla */

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


      /* BUTTON */

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


        /* BÜTÇE */

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
              .setRequired(true);

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


        /* OYUN */

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


        /* CPU */

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


        /* GPU */

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


        /* OLUŞTUR */

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

                  `🎮 **${
                    GAMES[
                      session.game
                    ].name
                  }**\n` +

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

                  "🔎 Trendyol canlı fiyatları taranıyor...\n" +
                  "🧠 İşlemci ve ekran kartı seçiliyor...\n" +
                  "🔧 Uyumluluk kontrol ediliyor...\n" +
                  "💰 Son bütçe kontrolü yapılıyor..."

                )

            ],

            components: []

          });


          const result =
            await makeBuild(
              session
            );


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

                    "Canlı fiyatlarda uygun " +
                    "parçalarla sistem oluşturamadım.\n\n" +

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
                    }`

                  )

              ],

              components: []

            });

            return;
          }


          const over =
            result.total >
            session.budget;


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
                  session.cpu ===
                  "amd"
                    ? "AMD"
                    : "Intel"
                }\n` +

                `🎮 **GPU tercihi:** ${
                  session.gpu ===
                  "nvidia"
                    ? "NVIDIA"
                    : "AMD"
                }\n\n` +

                `💰 **Bütçe:** ${
                  money(
                    session.budget
                  )
                }\n` +

                `📈 **Maksimum:** ${
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

                    ? `🟡 Bütçenin ${
                        money(
                          result.total -
                          session.budget
                        )
                      } üzerinde`

                    : `🟢 Bütçenin ${
                        money(
                          session.budget -
                          result.total
                        )
                      } altında`
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

              inline: false

            });

          }


          if (
            session.budget >=
            120000
          ) {

            embed.addFields({

              name:
                "💀 120K+ Bölgesi",

              value:
                "Bu bütçede artık ekran kartı sistemi değil, sistemi ekran kartı seçiyor.",

              inline: false

            });

          }


          await interaction.editReply({

            embeds: [
              embed
            ],

            components: []

          });

          return;
        }
      }


      /* SELECT MENÜ */

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
              "❌ Oturum bulunamadı.",

            ephemeral: true

          });

          return;
        }


        if (
          interaction.customId ===
          "game_select"
        ) {

          session.game =
            interaction.values[0];

          await interaction.update({

            content:
              `✅ Oyun: **${
                GAMES[
                  session.game
                ].name
              }**`,

            components: []

          });

          return;
        }


        if (
          interaction.customId ===
          "cpu_select"
        ) {

          session.cpu =
            interaction.values[0];

          await interaction.update({

            content:
              `✅ CPU: **${
                session.cpu ===
                "amd"
                  ? "AMD"
                  : "Intel"
              }**`,

            components: []

          });

          return;
        }


        if (
          interaction.customId ===
          "gpu_select"
        ) {

          session.gpu =
            interaction.values[0];

          await interaction.update({

            content:
              `✅ GPU: **${
                session.gpu ===
                "nvidia"
                  ? "NVIDIA"
                  : "AMD"
              }**`,

            components: []

          });

          return;
        }
      }


      /* MODAL */

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
              "❌ Oturum bulunamadı.",

            ephemeral: true

          });

          return;
        }


        const raw =
          interaction.fields
            .getTextInputValue(
              "budget_input"
            );


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

            ephemeral: true

          });

          return;
        }


        session.budget =
          Math.floor(
            budget
          );


        await interaction.reply({

          content:

            `✅ Bütçe: **${
              money(
                budget
              )
            }**\n` +

            `📈 Maksimum sistem bütçesi: **${
              money(
                budget +
                MAX_EXTRA_BUDGET
              )
            }**`,

          ephemeral: true

        });

        return;
      }

    }

    catch (error) {

      console.error(
        "INTERACTION ERROR:",
        error
      );

      try {

        if (
          interaction.replied ||
          interaction.deferred
        ) {

          await interaction.followUp({

            content:
              "❌ Bir hata oluştu. GitHub Actions logunu kontrol et.",

            ephemeral: true

          });

        } else {

          await interaction.reply({

            content:
              "❌ Bir hata oluştu.",

            ephemeral: true

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