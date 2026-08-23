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

/* =========================================================
   AYARLAR
========================================================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const REEF_KEY = process.env.REEF_KEY;

if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN eksik.");
}

if (!REEF_KEY) {
  throw new Error("REEF_KEY eksik.");
}

/*
  Node.js 18+ kullan.
*/

const sessions = new Map();

/*
  Bütçenin en fazla ne kadar aşılabileceği.
  Örnek:
  75.000 TL bütçe -> maksimum 90.000 TL
*/
const MAX_OVER_BUDGET = 15000;

/* =========================================================
   OYUNLAR
========================================================= */

const GAMES = {
  valorant: {
    name: "VALORANT",
    cpu: 1.15,
    gpu: 0.75
  },

  cs2: {
    name: "Counter-Strike 2",
    cpu: 1.15,
    gpu: 0.90
  },

  minecraft: {
    name: "Minecraft",
    cpu: 1.10,
    gpu: 0.85
  },

  fortnite: {
    name: "Fortnite",
    cpu: 1.00,
    gpu: 1.05
  },

  gta5: {
    name: "GTA V",
    cpu: 0.95,
    gpu: 1.10
  },

  rdr2: {
    name: "Red Dead Redemption 2",
    cpu: 0.90,
    gpu: 1.25
  },

  fc: {
    name: "EA SPORTS FC",
    cpu: 1.00,
    gpu: 1.00
  },

  cyberpunk: {
    name: "Cyberpunk 2077",
    cpu: 0.90,
    gpu: 1.40
  }
};

/* =========================================================
   CPU HAVUZU
========================================================= */

const CPU = {
  amd: [
    {
      name: "Ryzen 5 5500",
      query: "AMD Ryzen 5 5500",
      tier: 1,
      platform: "am4"
    },
    {
      name: "Ryzen 5 5600",
      query: "AMD Ryzen 5 5600",
      tier: 2,
      platform: "am4"
    },
    {
      name: "Ryzen 5 7500F",
      query: "AMD Ryzen 5 7500F",
      tier: 3,
      platform: "am5"
    },
    {
      name: "Ryzen 5 7600",
      query: "AMD Ryzen 5 7600",
      tier: 4,
      platform: "am5"
    },
    {
      name: "Ryzen 7 7700",
      query: "AMD Ryzen 7 7700",
      tier: 4,
      platform: "am5"
    },
    {
      name: "Ryzen 7 7800X3D",
      query: "AMD Ryzen 7 7800X3D",
      tier: 5,
      platform: "am5"
    }
  ],

  intel: [
    {
      name: "Intel Core i3-12100F",
      query: "Intel Core i3 12100F",
      tier: 1,
      platform: "lga1700"
    },
    {
      name: "Intel Core i5-12400F",
      query: "Intel Core i5 12400F",
      tier: 2,
      platform: "lga1700"
    },
    {
      name: "Intel Core i5-14400F",
      query: "Intel Core i5 14400F",
      tier: 3,
      platform: "lga1700"
    },
    {
      name: "Intel Core i5-14600KF",
      query: "Intel Core i5 14600KF",
      tier: 4,
      platform: "lga1700"
    },
    {
      name: "Intel Core i7-14700F",
      query: "Intel Core i7 14700F",
      tier: 5,
      platform: "lga1700"
    }
  ]
};

/* =========================================================
   GPU HAVUZU
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
      name: "RTX 4060 Ti 8GB",
      query: "RTX 4060 Ti 8GB",
      tier: 3
    },
    {
      name: "RTX 5060 8GB",
      query: "RTX 5060 8GB",
      tier: 3
    },
    {
      name: "RTX 5070 12GB",
      query: "RTX 5070 12GB",
      tier: 4
    },
    {
      name: "RTX 5070 Ti 16GB",
      query: "RTX 5070 Ti 16GB",
      tier: 5
    },
    {
      name: "RTX 5080 16GB",
      query: "RTX 5080 16GB",
      tier: 6
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
      name: "RX 7700 XT 12GB",
      query: "RX 7700 XT 12GB",
      tier: 3
    },
    {
      name: "RX 7800 XT 16GB",
      query: "RX 7800 XT 16GB",
      tier: 4
    },
    {
      name: "RX 9070 XT 16GB",
      query: "RX 9070 XT 16GB",
      tier: 5
    },
    {
      name: "RX 7900 XTX 24GB",
      query: "RX 7900 XTX 24GB",
      tier: 6
    }
  ]
};

/* =========================================================
   PARA
========================================================= */

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

/* =========================================================
   NORMALIZE
========================================================= */

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* =========================================================
   REEF API
========================================================= */

async function reefSearch(query) {
  const response = await fetch(
    "https://api.reefapi.com/trendyol/v1/search",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-api-key": REEF_KEY
      },

      body: JSON.stringify({
        query,
        page: 1,
        max_pages: 2,
        sort: "default"
      })
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Reef JSON hatası: ${text.slice(0, 300)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Reef ${response.status}: ${
        data?.message || text
      }`
    );
  }

  return (
    data?.data?.results ||
    data?.results ||
    data?.data ||
    []
  );
}

/* =========================================================
   ÜRÜN BİLGİLERİ
========================================================= */

function getPrice(product) {
  const values = [
    product.price,
    product.salePrice,
    product.discountedPrice,
    product.currentPrice
  ];

  for (const value of values) {
    if (typeof value === "number" && value > 0) {
      return value;
    }

    if (typeof value === "string") {
      const cleaned = value
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

      const n = Number(cleaned);

      if (Number.isFinite(n) && n > 0) {
        return n;
      }
    }
  }

  return null;
}

function getTitle(product) {
  return (
    product.title ||
    product.name ||
    product.productName ||
    ""
  );
}

function getUrl(product) {
  return (
    product.url ||
    product.productUrl ||
    product.link ||
    null
  );
}

/* =========================================================
   ÜRÜN FİLTRELERİ
========================================================= */

function hasAny(text, words) {
  return words.some(word =>
    text.includes(normalize(word))
  );
}

/* ---------- CPU ---------- */

function validCPU(title, wanted) {
  const t = normalize(title);
  const q = normalize(wanted);

  if (!t.includes(q)) {
    return false;
  }

  if (
    hasAny(t, [
      "sogutucu",
      "fan",
      "anakart",
      "laptop",
      "notebook",
      "kutu",
      "cooler",
      "sogutma"
    ])
  ) {
    return false;
  }

  return (
    t.includes("ryzen") ||
    t.includes("core i") ||
    t.includes("core ultra")
  );
}

/* ---------- GPU ---------- */

function validGPU(title, wanted) {
  const t = normalize(title);
  const q = normalize(wanted);

  if (!t.includes(q)) {
    return false;
  }

  if (
    hasAny(t, [
      "laptop",
      "notebook",
      "kasali",
      "oyuncu bilgisayar",
      "hazir sistem",
      "adaptör",
      "kablo",
      "fan"
    ])
  ) {
    return false;
  }

  return (
    t.includes("rtx") ||
    t.includes("rx ") ||
    t.includes("geforce") ||
    t.includes("radeon")
  );
}

/* ---------- RAM ---------- */

function validRAM(title, minGB) {
  const t = normalize(title);

  if (
    !t.includes("ram") &&
    !t.includes("memory")
  ) {
    return false;
  }

  if (
    hasAny(t, [
      "laptop",
      "notebook",
      "server",
      "sodimm",
      "kutu",
      "adaptör",
      "soğutucu"
    ])
  ) {
    return false;
  }

  if (
    minGB >= 32 &&
    !hasAny(t, [
      "32gb",
      "2x16",
      "2 x 16",
      "64gb"
    ])
  ) {
    return false;
  }

  if (
    minGB >= 16 &&
    !hasAny(t, [
      "16gb",
      "32gb",
      "64gb",
      "2x8",
      "2 x 8"
    ])
  ) {
    return false;
  }

  return (
    t.includes("ddr4") ||
    t.includes("ddr5")
  );
}

/* ---------- SSD ---------- */

function validSSD(title, minGB) {
  const t = normalize(title);

  if (!t.includes("ssd")) {
    return false;
  }

  if (
    hasAny(t, [
      "kutu",
      "hard disk kutusu",
      "adaptör",
      "usb kutu",
      "harici kutu",
      "m2 kutu"
    ])
  ) {
    return false;
  }

  /*
    120/128GB kesinlikle istemiyoruz.
  */

  if (
    minGB >= 500 &&
    (
      t.includes("120gb") ||
      t.includes("128gb") ||
      t.includes("240gb") ||
      t.includes("256gb")
    )
  ) {
    return false;
  }

  return true;
}

/* ---------- ANAKART ---------- */

function validMotherboard(title, platform) {
  const t = normalize(title);

  if (
    !hasAny(t, [
      "anakart",
      "motherboard",
      "b550",
      "b650",
      "b760",
      "z790",
      "z890",
      "a520",
      "a620"
    ])
  ) {
    return false;
  }

  if (
    hasAny(t, [
      "islemci hediyeli",
      "islemci",
      "ram hediyeli"
    ])
  ) {
    /*
      Üründe CPU hediyesi gibi saçmalık varsa
      anakart yerine bundle olabilir.
    */
    if (
      !t.includes("anakart")
    ) {
      return false;
    }
  }

  if (platform === "am4") {
    return (
      t.includes("b450") ||
      t.includes("b550") ||
      t.includes("a520")
    );
  }

  if (platform === "am5") {
    return (
      t.includes("a620") ||
      t.includes("b650") ||
      t.includes("b850") ||
      t.includes("x670") ||
      t.includes("x870")
    );
  }

  if (platform === "lga1700") {
    return (
      t.includes("h610") ||
      t.includes("b660") ||
      t.includes("b760") ||
      t.includes("z690") ||
      t.includes("z790")
    );
  }

  return false;
}

/* ---------- PSU ---------- */

function validPSU(title, wattMin) {
  const t = normalize(title);

  if (
    !hasAny(t, [
      "psu",
      "power supply",
      "guc kaynagi",
      "güç kaynağı"
    ])
  ) {
    return false;
  }

  if (
    hasAny(t, [
      "kablo",
      "fan",
      "moduler kablo",
      "sadece kablo"
    ])
  ) {
    return false;
  }

  /*
    Watt kontrolü.
  */

  const watts =
    t.match(/(\d{3,4})w/);

  if (watts) {
    const w = Number(watts[1]);

    if (w < wattMin) {
      return false;
    }
  }

  return true;
}

/* ---------- KASA ---------- */

function validCase(title) {
  const t = normalize(title);

  if (
    !hasAny(t, [
      "kasa",
      "pc case",
      "gaming case",
      "bilgisayar kasasi"
    ])
  ) {
    return false;
  }

  /*
    FANLARI KASA SANMA.
  */

  if (
    hasAny(t, [
      "fan 1 adet",
      "fanli",
      "fanli 1 adet",
      "kasa ici fan",
      "kasa ici uyumlu",
      "molex",
      "sadece fan",
      "12cm fan",
      "120mm fan",
      "140mm fan",
      "rgb fan"
    ])
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   FİYAT ARAMA
========================================================= */

async function findPrice(
  query,
  type,
  maxPrice,
  options = {}
) {
  const results =
    await reefSearch(query);

  const products = results
    .map(product => ({
      title: getTitle(product),
      price: getPrice(product),
      url: getUrl(product),
      brand:
        product.brand ||
        product.merchantName ||
        "Trendyol"
    }))
    .filter(product => {
      if (!product.price) {
        return false;
      }

      if (product.price > maxPrice) {
        return false;
      }

      if (
        type === "cpu"
      ) {
        return validCPU(
          product.title,
          options.wanted
        );
      }

      if (
        type === "gpu"
      ) {
        return validGPU(
          product.title,
          options.wanted
        );
      }

      if (
        type === "ram"
      ) {
        return validRAM(
          product.title,
          options.minGB
        );
      }

      if (
        type === "ssd"
      ) {
        return validSSD(
          product.title,
          options.minGB
        );
      }

      if (
        type === "motherboard"
      ) {
        return validMotherboard(
          product.title,
          options.platform
        );
      }

      if (
        type === "psu"
      ) {
        return validPSU(
          product.title,
          options.wattMin
        );
      }

      if (
        type === "case"
      ) {
        return validCase(
          product.title
        );
      }

      return true;
    });

  /*
    En ucuzu seçiyoruz ama filtrelerden geçen
    GERÇEK ürünler arasından.
  */

  products.sort(
    (a, b) =>
      a.price - b.price
  );

  return products[0] || null;
}

/* =========================================================
   TIER
========================================================= */

function targetTier(
  budget,
  game
) {
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
  } else {
    tier = 6;
  }

  const profile =
    GAMES[game];

  if (profile.gpu >= 1.25) {
    tier += 0.5;
  }

  if (profile.cpu >= 1.15) {
    tier += 0.25;
  }

  return Math.min(
    6,
    Math.max(1, tier)
  );
}

/* =========================================================
   DONANIM BÜTÇELERİ
========================================================= */

function componentLimits(
  budget,
  cpu,
  gpu
) {
  /*
    Bunlar kesin fiyat değil.
    Reef aramasına maksimum fiyat rehberi.
  */

  return {
    cpu:
      Math.floor(
        budget * 0.20
      ),

    gpu:
      Math.floor(
        budget * 0.43
      ),

    ram:
      Math.floor(
        budget * 0.13
      ),

    ssd:
      Math.floor(
        budget * 0.08
      ),

    motherboard:
      Math.floor(
        budget * 0.12
      ),

    psu:
      Math.floor(
        budget * 0.11
      ),

    case:
      Math.floor(
        budget * 0.08
      )
  };
}

/* =========================================================
   SİSTEM ADAYI
========================================================= */

async function buildCandidate(
  session,
  cpu,
  gpu
) {
  const budget =
    session.budget;

  const maxTotal =
    budget +
    MAX_OVER_BUDGET;

  const limits =
    componentLimits(
      budget,
      cpu,
      gpu
    );

  /*
    RAM
  */

  const ramGB =
    budget >= 60000
      ? 32
      : 16;

  const ramQuery =
    ramGB === 32
      ? "32GB DDR5 6000 2x16 RAM"
      : cpu.platform === "am4"
        ? "16GB DDR4 3200 2x8 RAM"
        : "16GB DDR5 6000 RAM";

  /*
    SSD
  */

  const ssdGB =
    budget >= 55000
      ? 1000
      : 500;

  const ssdQuery =
    ssdGB === 1000
      ? "1TB NVMe M.2 SSD"
      : "500GB NVMe M.2 SSD";

  /*
    ANAKART
  */

  let motherboardQuery;

  if (
    cpu.platform === "am4"
  ) {
    motherboardQuery =
      "B550 DDR4 AM4 anakart";
  } else if (
    cpu.platform === "am5"
  ) {
    motherboardQuery =
      "B650 DDR5 AM5 anakart";
  } else {
    motherboardQuery =
      "B760 DDR5 LGA1700 anakart";
  }

  /*
    PSU
  */

  let wattMin = 650;

  if (gpu.tier >= 5) {
    wattMin = 850;
  } else if (gpu.tier >= 4) {
    wattMin = 750;
  }

  const psuQuery =
    wattMin >= 850
      ? "850W 80 Plus Gold PSU"
      : wattMin >= 750
        ? "750W 80 Plus Gold PSU"
        : "650W 80 Plus Bronze PSU";

  /*
    KASA
  */

  const caseQuery =
    "ATX mATX Mesh Gaming PC Kasa";

  const [
    cpuProduct,
    gpuProduct,
    ramProduct,
    ssdProduct,
    motherboardProduct,
    psuProduct,
    caseProduct
  ] = await Promise.all([
    findPrice(
      cpu.query,
      "cpu",
      limits.cpu,
      {
        wanted: cpu.name
      }
    ),

    findPrice(
      gpu.query,
      "gpu",
      limits.gpu,
      {
        wanted: gpu.name
      }
    ),

    findPrice(
      ramQuery,
      "ram",
      limits.ram,
      {
        minGB: ramGB
      }
    ),

    findPrice(
      ssdQuery,
      "ssd",
      limits.ssd,
      {
        minGB: ssdGB
      }
    ),

    findPrice(
      motherboardQuery,
      "motherboard",
      limits.motherboard,
      {
        platform:
          cpu.platform
      }
    ),

    findPrice(
      psuQuery,
      "psu",
      limits.psu,
      {
        wattMin
      }
    ),

    findPrice(
      caseQuery,
      "case",
      limits.case
    )
  ]);

  /*
    Bir parça bile yoksa aday geçersiz.
  */

  if (
    !cpuProduct ||
    !gpuProduct ||
    !ramProduct ||
    !ssdProduct ||
    !motherboardProduct ||
    !psuProduct ||
    !caseProduct
  ) {
    return null;
  }

  const parts = [
    ["🧠 İşlemci", cpuProduct],
    ["🎮 Ekran Kartı", gpuProduct],
    ["🧩 RAM", ramProduct],
    ["💾 SSD", ssdProduct],
    ["🔧 Anakart", motherboardProduct],
    ["⚡ PSU", psuProduct],
    ["📦 Kasa", caseProduct]
  ];

  const total =
    parts.reduce(
      (sum, [, product]) =>
        sum + product.price,
      0
    );

  /*
    15K'dan fazla aşma kesinlikle yok.
  */

  if (total > maxTotal) {
    return null;
  }

  /*
    Çok saçma ucuz SSD/RAM/kasa vb. kontrolü.
  */

  if (
    ssdProduct.price < 500
  ) {
    return null;
  }

  if (
    ramProduct.price < 1000
  ) {
    return null;
  }

  if (
    caseProduct.price < 1000
  ) {
    return null;
  }

  return {
    parts,
    total,
    cpu: cpu.name,
    gpu: gpu.name,
    platform: cpu.platform
  };
}

/* =========================================================
   EN UYGUN SİSTEM
========================================================= */

async function makeBuild(
  session
) {
  const cpuList =
    CPU[session.cpu];

  const gpuList =
    GPU[session.gpu];

  const wanted =
    targetTier(
      session.budget,
      session.game
    );

  const combinations = [];

  for (
    const cpu of cpuList
  ) {
    for (
      const gpu of gpuList
    ) {
      const game =
        GAMES[
          session.game
        ];

      let score =
        Math.abs(
          cpu.tier -
          wanted
        ) +
        Math.abs(
          gpu.tier -
          wanted
        );

      /*
        Oyunun karakterine göre
        CPU/GPU dengesi.
      */

      score +=
        Math.abs(
          cpu.tier * game.cpu -
          gpu.tier * game.gpu
        ) * 0.35;

      combinations.push({
        cpu,
        gpu,
        score
      });
    }
  }

  combinations.sort(
    (a, b) =>
      a.score - b.score
  );

  /*
    İlk 10 aday.
    Bir kombinasyon Reef'te bulunamazsa
    diğerine geç.
  */

  for (
    const candidate
    of combinations.slice(0, 10)
  ) {
    try {
      const result =
        await buildCandidate(
          session,
          candidate.cpu,
          candidate.gpu
        );

      if (!result) {
        continue;
      }

      /*
        Skor:
        bütçeye yakınlık + performans.
      */

      result.score =
        Math.abs(
          result.total -
          session.budget
        );

      return result;

    } catch (error) {
      console.error(
        "Aday sistem hatası:",
        error.message
      );
    }
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
      .setColor(0x5865f2)
      .setTitle(
        "🖥️ PC TOPLA"
      )
      .setDescription(
        "Aşağıdaki butonlardan seçimlerini yap.\n" +
        "⚠️ **PC'Yİ OLUŞTUR** demeden sistem aranmaz.\n\n" +

        `💰 **Bütçe:** ${
          session.budget
            ? money(
                session.budget
              )
            : "Seçilmedi"
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
        }\n\n` +

        "🛒 ReefAPI canlı fiyatları kullanılır."
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
              : "🎮 AMD GPU"
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
   ANA MESAJI GÜNCELLE
========================================================= */

async function updateMainPanel(
  session
) {
  try {
    const channel =
      await client.channels.fetch(
        session.channelId
      );

    const message =
      await channel.messages.fetch(
        session.messageId
      );

    await message.edit(
      panel(session)
    );

  } catch (error) {
    console.error(
      "Panel güncelleme hatası:",
      error.message
    );
  }
}

/* =========================================================
   OYUN MENÜSÜ
========================================================= */

function gameMenu() {
  return new StringSelectMenuBuilder()
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
          emoji: "🎮"
        })
      )
    );
}

/* =========================================================
   CPU MENÜSÜ
========================================================= */

function cpuMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId(
      "cpu_select"
    )
    .setPlaceholder(
      "🧠 CPU markası seç"
    )
    .addOptions(
      {
        label: "AMD",
        value: "amd",
        emoji: "🧠"
      },
      {
        label: "Intel",
        value: "intel",
        emoji: "🧠"
      }
    );
}

/* =========================================================
   GPU MENÜSÜ
========================================================= */

function gpuMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId(
      "gpu_select"
    )
    .setPlaceholder(
      "🎮 GPU markası seç"
    )
    .addOptions(
      {
        label: "NVIDIA",
        value: "nvidia",
        emoji: "🎮"
      },
      {
        label: "AMD",
        value: "amd",
        emoji: "🎮"
      }
    );
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

      /* =====================================================
         /pctopla
      ===================================================== */

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "pctopla"
      ) {

        const session = {
          userId:
            interaction.user.id,

          channelId:
            interaction.channelId,

          messageId:
            null,

          budget:
            null,

          game:
            null,

          cpu:
            "amd",

          gpu:
            "nvidia"
        };

        sessions.set(
          interaction.user.id,
          session
        );

        const message =
          await interaction.reply({
            ...panel(session),
            fetchReply: true
          });

        session.messageId =
          message.id;

        return;
      }

      /* =====================================================
         BUTONLAR
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

        /* ---------------- BÜTÇE ---------------- */

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
                "💰 Bütçe"
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
                "Örn: 75000"
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

        /* ---------------- OYUN ---------------- */

        if (
          interaction.customId ===
          "game"
        ) {

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x5865f2
                )
                .setTitle(
                  "🎮 OYUN SEÇ"
                )
                .setDescription(
                  "Oyunu seç. Seçim yaptıktan sonra ana panel geri gelecek."
                )
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  gameMenu()
                )
            ]
          });

          return;
        }

        /* ---------------- CPU ---------------- */

        if (
          interaction.customId ===
          "cpu"
        ) {

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x5865f2
                )
                .setTitle(
                  "🧠 CPU MARKASI"
                )
                .setDescription(
                  "İşlemci markanı seç."
                )
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  cpuMenu()
                )
            ]
          });

          return;
        }

        /* ---------------- GPU ---------------- */

        if (
          interaction.customId ===
          "gpu"
        ) {

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x5865f2
                )
                .setTitle(
                  "🎮 GPU MARKASI"
                )
                .setDescription(
                  "Ekran kartı markanı seç."
                )
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  gpuMenu()
                )
            ]
          });

          return;
        }

        /* ---------------- OLUŞTUR ---------------- */

        if (
          interaction.customId ===
          "create"
        ) {

          if (
            !session.budget
          ) {
            await interaction.reply({
              content:
                "💰 Önce bütçeni seç.",
              ephemeral: true
            });

            return;
          }

          if (
            !session.game
          ) {
            await interaction.reply({
              content:
                "🎮 Önce oyununu seç.",
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
                  `🎮 **${GAMES[
                    session.game
                  ].name}**\n` +
                  `💰 **${money(
                    session.budget
                  )}**\n\n` +
                  "🧠 Oyun için uygun donanım seviyesi hesaplanıyor...\n" +
                  "🛒 ReefAPI canlı fiyatları taranıyor...\n" +
                  "🔧 Uyumluluk kontrol ediliyor...\n" +
                  "🧹 Fan/kutu/yanlış ürünler filtreleniyor...\n" +
                  "💰 Maksimum +15.000 TL sınırı kontrol ediliyor..."
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
                    "Canlı ReefAPI sonuçlarında uygun ve doğrulanabilir parçalarla sistem oluşturamadım.\n\n" +
                    `💰 Bütçe: **${money(
                      session.budget
                    )}**\n` +
                    `📈 İzin verilen maksimum: **${money(
                      session.budget +
                        MAX_OVER_BUDGET
                    )}**\n\n` +
                    "💡 Başka CPU/GPU markası veya biraz daha yüksek bütçe deneyebilirsin."
                  )
              ],
              components: []
            });

            sessions.delete(
              interaction.user.id
            );

            return;
          }

          const over =
            Math.max(
              0,
              result.total -
                session.budget
            );

          const remaining =
            session.budget -
            result.total;

          let description =
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

            `💰 **Bütçe:** ${money(
              session.budget
            )}\n` +

            `💵 **Toplam:** ${money(
              result.total
            )}\n`;

          if (
            over > 0
          ) {
            description +=
              `🟠 **Bütçenin ${money(
                over
              )} üstünde**\n`;
          } else {
            description +=
              `🟢 **Bütçenin ${money(
                Math.abs(
                  remaining
                )
              )} altında**\n`;
          }

          if (
            session.budget >=
            120000
          ) {
            description +=
              "\n💀 **120K+ Bölgesi:** " +
              "Burada ekran kartı artık sistemin aile büyüğü.";
          }

          const embed =
            new EmbedBuilder()
              .setColor(
                over > 0
                  ? 0xf1c40f
                  : 0x57f287
              )
              .setTitle(
                "🚀 PC HAZIR!"
              )
              .setDescription(
                description
              );

          for (
            const [
              name,
              product
            ] of result.parts
          ) {

            embed.addFields({
              name,
              value:
                `**${product.title}**\n` +
                `💰 **${money(
                  product.price
                )}**\n` +
                `🏪 ${product.brand}\n` +
                (
                  product.url
                    ? `[🛒 Ürünü görüntüle](${product.url})`
                    : "🔗 Link bulunamadı"
                ),
              inline: false
            });
          }

          await interaction.editReply({
            embeds: [embed],
            components: []
          });

          sessions.delete(
            interaction.user.id
          );

          return;
        }
      }

      /* =====================================================
         SELECT MENÜLER
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
              "❌ Oturum bulunamadı.",
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

          await interaction.update(
            panel(session)
          );

          return;
        }

        /* CPU */

        if (
          interaction.customId ===
          "cpu_select"
        ) {

          session.cpu =
            interaction.values[0];

          await interaction.update(
            panel(session)
          );

          return;
        }

        /* GPU */

        if (
          interaction.customId ===
          "gpu_select"
        ) {

          session.gpu =
            interaction.values[0];

          await interaction.update(
            panel(session)
          );

          return;
        }
      }

      /* =====================================================
         BÜTÇE MODAL
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

        /*
          Modal cevabını gizli göster.
        */

        await interaction.reply({
          content:
            `✅ Bütçe **${money(
              session.budget
            )}** olarak ayarlandı.`,
          ephemeral: true
        });

        /*
          ASIL PANELİ GÜNCELLE.
        */

        await updateMainPanel(
          session
        );

        return;
      }

    } catch (error) {

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
              "❌ Bir hata oluştu. Railway Logs'u kontrol et.",
            ephemeral: true
          });

        } else {

          await interaction.reply({
            content:
              "❌ Bir hata oluştu. Railway Logs'u kontrol et.",
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