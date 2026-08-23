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
const REEF_KEY = process.env.REEF_KEY;

if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN eksik!");
}

if (!REEF_KEY) {
  throw new Error("REEF_KEY eksik!");
}

/*
=========================================================
SESSION
=========================================================
*/

const sessions = new Map();

/*
=========================================================
OYUNLAR
=========================================================
*/

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

/*
=========================================================
CPU HAVUZU
=========================================================
*/

const CPU = {
  amd: [
    {
      name: "Ryzen 5 5500",
      query: "Ryzen 5 5500",
      tier: 1
    },
    {
      name: "Ryzen 5 5600",
      query: "Ryzen 5 5600",
      tier: 2
    },
    {
      name: "Ryzen 5 7500F",
      query: "Ryzen 5 7500F",
      tier: 3
    },
    {
      name: "Ryzen 5 7600",
      query: "Ryzen 5 7600",
      tier: 4
    },
    {
      name: "Ryzen 7 7800X3D",
      query: "Ryzen 7 7800X3D",
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
      name: "Intel Core i5-14400F",
      query: "Intel Core i5 14400F",
      tier: 3
    },
    {
      name: "Intel Core i5-14600KF",
      query: "Intel Core i5 14600KF",
      tier: 4
    },
    {
      name: "Intel Core i7-14700F",
      query: "Intel Core i7 14700F",
      tier: 5
    }
  ]
};

/*
=========================================================
GPU HAVUZU
=========================================================
*/

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

/*
=========================================================
PARA
=========================================================
*/

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

/*
=========================================================
MAKSİMUM BÜTÇE
=========================================================
*/

function getMaxBudget(budget) {
  if (budget >= 120000) {
    return budget + 15000;
  }

  if (budget >= 100000) {
    return budget + 15000;
  }

  if (budget >= 75000) {
    return budget + 10000;
  }

  if (budget >= 50000) {
    return budget + 7500;
  }

  return budget + 5000;
}

/*
=========================================================
NORMALIZE
=========================================================
*/

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
=========================================================
REEF API
=========================================================
*/

async function reefSearch(query) {
  console.log(`[REEF] Aranıyor: ${query}`);

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
        max_pages: 1,
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
      `Reef JSON hatası: ${text.slice(0, 500)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Reef ${response.status}: ${
        data?.message ||
        data?.error ||
        text.slice(0, 300)
      }`
    );
  }

  const results =
    data?.data?.results ||
    data?.results ||
    data?.data ||
    [];

  if (!Array.isArray(results)) {
    console.log(
      "[REEF] Beklenmeyen sonuç:",
      JSON.stringify(data).slice(0, 1000)
    );

    return [];
  }

  console.log(
    `[REEF] ${results.length} sonuç bulundu: ${query}`
  );

  return results;
}

/*
=========================================================
FİYAT
=========================================================
*/

function getPrice(product) {
  const values = [
    product.price_value,
    product.priceValue,
    product.sale_price_value,
    product.discounted_price_value,
    product.price,
    product.salePrice,
    product.discountedPrice,
    product.currentPrice
  ];

  for (const value of values) {
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
  }

  return null;
}

/*
=========================================================
ÜRÜN ADI
=========================================================
*/

function getTitle(product) {
  return (
    product.title ||
    product.name ||
    product.productName ||
    product.product_title ||
    ""
  );
}

/*
=========================================================
URL
=========================================================
*/

function getUrl(product) {
  return (
    product.url ||
    product.productUrl ||
    product.product_url ||
    product.link ||
    null
  );
}

/*
=========================================================
MARKA
=========================================================
*/

function getBrand(product) {
  return (
    product.brand ||
    product.brandName ||
    product.merchantName ||
    "Trendyol"
  );
}

/*
=========================================================
ÜRÜN DOĞRULAMA
=========================================================
*/

function validProduct(title, type, expectedQuery = "") {
  const t = normalize(title);
  const q = normalize(expectedQuery);

  /*
  CPU
  */

  if (type === "cpu") {
    if (
      !(
        t.includes("ryzen") ||
        t.includes("core i") ||
        t.includes("core ultra")
      )
    ) {
      return false;
    }

    /*
    Yanlış Intel/AMD modeli engelle.
    */

    if (q.includes("ryzen") && !t.includes("ryzen")) {
      return false;
    }

    if (
      q.includes("intel") &&
      !t.includes("intel") &&
      !t.includes("core")
    ) {
      return false;
    }

    return true;
  }

  /*
  GPU
  */

  if (type === "gpu") {
    if (
      !(
        t.includes("rtx ") ||
        t.includes("rx ") ||
        t.includes("geforce") ||
        t.includes("radeon")
      )
    ) {
      return false;
    }

    if (q.includes("rtx") && !t.includes("rtx")) {
      return false;
    }

    if (q.includes("rx ") && !t.includes("rx ")) {
      return false;
    }

    return true;
  }

  /*
  RAM
  */

  if (type === "ram") {
    return (
      t.includes("ram") &&
      (
        t.includes("ddr4") ||
        t.includes("ddr5")
      ) &&
      !t.includes("anakart") &&
      !t.includes("laptop")
    );
  }

  /*
  SSD
  */

  if (type === "ssd") {
    return (
      t.includes("ssd") &&
      !t.includes("kutu") &&
      !t.includes("adaptör") &&
      !t.includes("adapter") &&
      !t.includes("hard disk kutusu") &&
      !t.includes("harici kutu")
    );
  }

  /*
  ANAKART
  */

  if (type === "motherboard") {
    return (
      (
        t.includes("anakart") ||
        t.includes("motherboard") ||
        t.includes("b550") ||
        t.includes("b650") ||
        t.includes("b760") ||
        t.includes("z790") ||
        t.includes("z890")
      ) &&
      !t.includes("ram") &&
      !t.includes("ddr2 ram")
    );
  }

  /*
  PSU
  */

  if (type === "psu") {
    return (
      (
        t.includes("psu") ||
        t.includes("power supply") ||
        t.includes("guc kaynagi") ||
        t.includes("güç kaynağı")
      ) &&
      !t.includes("kablo")
    );
  }

  /*
  KASA
  */

  if (type === "case") {
    return (
      (
        t.includes("kasa") ||
        t.includes("pc case") ||
        t.includes("gaming case")
      ) &&
      !t.includes("telefon") &&
      !t.includes("laptop") &&
      !t.includes("tablet")
    );
  }

  return true;
}

/*
=========================================================
REEF'TEN EN UYGUN ÜRÜN
=========================================================
*/

async function findPrice(
  query,
  type,
  maxPrice = Infinity
) {
  const results = await reefSearch(query);

  const products = results
    .map(product => ({
      title: getTitle(product),
      price: getPrice(product),
      url: getUrl(product),
      brand: getBrand(product)
    }))
    .filter(product => {
      if (!product.title) return false;
      if (!product.price) return false;

      if (product.price > maxPrice) {
        return false;
      }

      return validProduct(
        product.title,
        type,
        query
      );
    })
    .sort(
      (a, b) => a.price - b.price
    );

  return products[0] || null;
}

/*
=========================================================
CPU PLATFORMU
=========================================================
*/

function platformForCPU(cpu) {
  const name = normalize(cpu);

  if (
    name.includes("7500f") ||
    name.includes("7600") ||
    name.includes("7800x3d")
  ) {
    return "am5";
  }

  if (
    name.includes("5500") ||
    name.includes("5600")
  ) {
    return "am4";
  }

  if (
    name.includes("12100") ||
    name.includes("12400") ||
    name.includes("14400") ||
    name.includes("14600") ||
    name.includes("14700")
  ) {
    return "lga1700";
  }

  return "am5";
}

/*
=========================================================
TIER HEDEFİ
=========================================================
*/

function targetTier(session) {
  const game = GAMES[session.game];

  let tier;

  /*
  Bütçeye göre temel seviye
  */

  if (session.budget < 35000) {
    tier = 1;
  } else if (session.budget < 50000) {
    tier = 2;
  } else if (session.budget < 65000) {
    tier = 3;
  } else if (session.budget < 80000) {
    tier = 4;
  } else if (session.budget < 110000) {
    tier = 5;
  } else {
    tier = 6;
  }

  /*
  Oyun CPU ağırlıklıysa CPU seviyesini biraz artır.
  */

  if (game.cpuWeight >= 1.20) {
    tier += 0.25;
  }

  /*
  Oyun GPU ağırlıklıysa GPU seviyesini biraz artır.
  */

  if (game.gpuWeight >= 1.25) {
    tier += 0.35;
  }

  return Math.min(
    6,
    Math.max(1, tier)
  );
}

/*
=========================================================
ADAY SİSTEM PLANI
=========================================================
*/

function buildPlan(
  session,
  cpu,
  gpu
) {
  const platform =
    platformForCPU(cpu.name);

  /*
  RAM
  */

  const ram =
    platform === "am4"
      ? {
          query: "16GB DDR4 3200 RAM",
          type: "ram"
        }
      : {
          query: "32GB DDR5 6000 RAM",
          type: "ram"
        };

  /*
  SSD
  */

  const ssd = {
    query:
      session.budget >= 60000
        ? "1TB NVMe SSD"
        : "500GB NVMe SSD",
    type: "ssd"
  };

  /*
  ANAKART
  */

  let motherboard;

  if (platform === "am4") {
    motherboard = {
      query: "B550 DDR4 AM4 anakart",
      type: "motherboard"
    };
  } else if (platform === "am5") {
    motherboard = {
      query: "B650 DDR5 AM5 anakart",
      type: "motherboard"
    };
  } else {
    motherboard = {
      query: "B760 DDR5 LGA1700 anakart",
      type: "motherboard"
    };
  }

  /*
  PSU
  */

  let psuQuery;

  if (gpu.tier >= 5) {
    psuQuery =
      "850W 80 Plus Gold PSU";
  } else if (gpu.tier >= 3) {
    psuQuery =
      "750W 80 Plus Gold PSU";
  } else {
    psuQuery =
      "650W 80 Plus Bronze PSU";
  }

  const psu = {
    query: psuQuery,
    type: "psu"
  };

  /*
  KASA
  */

  const pcCase = {
    query:
      "Mesh Airflow ATX Gaming PC Kasa",
    type: "case"
  };

  return {
    cpu: {
      query: cpu.query,
      type: "cpu"
    },

    gpu: {
      query: gpu.query,
      type: "gpu"
    },

    ram,
    ssd,
    motherboard,
    psu,
    case: pcCase
  };
}

/*
=========================================================
SİSTEM OLUŞTUR
=========================================================
*/

async function makeBuild(session) {
  const cpuList =
    CPU[session.cpu];

  const gpuList =
    GPU[session.gpu];

  const wanted =
    targetTier(session);

  const combinations = [];

  /*
  Bütün CPU/GPU kombinasyonlarını oluştur.
  */

  for (const cpu of cpuList) {
    for (const gpu of gpuList) {

      const game =
        GAMES[session.game];

      /*
      Oyun ağırlığı.
      */

      const cpuScore =
        Math.abs(cpu.tier - wanted) /
        game.cpuWeight;

      const gpuScore =
        Math.abs(gpu.tier - wanted) /
        game.gpuWeight;

      combinations.push({
        cpu,
        gpu,
        score:
          cpuScore + gpuScore
      });
    }
  }

  /*
  En mantıklı kombinasyonlar önce.
  */

  combinations.sort(
    (a, b) => a.score - b.score
  );

  /*
  Bütçe toleransı.
  */

  const maxBudget =
    getMaxBudget(session.budget);

  console.log(
    `[BUILD] Bütçe: ${session.budget}`
  );

  console.log(
    `[BUILD] Maksimum: ${maxBudget}`
  );

  const candidates = [];

  /*
  En fazla 12 kombinasyon dene.
  */

  for (
    const candidate
    of combinations.slice(0, 12)
  ) {

    try {

      const plan =
        buildPlan(
          session,
          candidate.cpu,
          candidate.gpu
        );

      console.log(
        `[BUILD] Deneniyor: ${candidate.cpu.name} + ${candidate.gpu.name}`
      );

      /*
      Reef aramalarını paralel yap.
      */

      const [
        cpu,
        gpu,
        ram,
        ssd,
        motherboard,
        psu,
        pcCase
      ] = await Promise.all([
        findPrice(
          plan.cpu.query,
          plan.cpu.type
        ),

        findPrice(
          plan.gpu.query,
          plan.gpu.type
        ),

        findPrice(
          plan.ram.query,
          plan.ram.type
        ),

        findPrice(
          plan.ssd.query,
          plan.ssd.type
        ),

        findPrice(
          plan.motherboard.query,
          plan.motherboard.type
        ),

        findPrice(
          plan.psu.query,
          plan.psu.type
        ),

        findPrice(
          plan.case.query,
          plan.case.type
        )
      ]);

      /*
      Her parça bulunmalı.
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

        console.log(
          "[BUILD] Eksik parça var."
        );

        continue;
      }

      /*
      Parçalar.
      */

      const parts = [
        ["🧠 İşlemci", cpu],
        ["🎮 Ekran Kartı", gpu],
        ["🧩 RAM", ram],
        ["💾 SSD", ssd],
        ["🔧 Anakart", motherboard],
        ["⚡ PSU", psu],
        ["📦 Kasa", pcCase]
      ];

      /*
      Toplam.
      */

      const total =
        parts.reduce(
          (sum, [, product]) =>
            sum + product.price,
          0
        );

      console.log(
        `[BUILD] Toplam: ${total}`
      );

      /*
      Maksimum toleransı geçiyorsa
      sistemi reddet.
      */

      if (total > maxBudget) {
        console.log(
          `[BUILD] Bütçe sınırı aşıldı: ${total}`
        );

        continue;
      }

      /*
      Kullanıcının istediği bütçeye
      ne kadar yakın?
      */

      const difference =
        Math.abs(
          session.budget - total
        );

      candidates.push({
        parts,
        total,
        difference,
        cpu: candidate.cpu.name,
        gpu: candidate.gpu.name,
        score: candidate.score
      });

    } catch (error) {

      console.error(
        `[BUILD] Aday hata:`,
        error.message
      );
    }
  }

  /*
  Hiç aday yok.
  */

  if (!candidates.length) {
    return null;
  }

  /*
  Önce bütçeye yakınlık.
  */

  candidates.sort(
    (a, b) => {

      /*
      Bütçenin altındaki sistemler
      tercih edilir ama aşırı ucuz
      sistemlere öncelik verilmez.
      */

      const aUnder =
        a.total <= session.budget;

      const bUnder =
        b.total <= session.budget;

      if (
        aUnder &&
        !bUnder
      ) {
        return -1;
      }

      if (
        !aUnder &&
        bUnder
      ) {
        return 1;
      }

      return (
        a.difference -
        b.difference
      );
    }
  );

  return candidates[0];
}

/*
=========================================================
ANA PANEL
=========================================================
*/

function createPanel(session) {

  const budgetText =
    session.budget
      ? money(session.budget)
      : "Henüz seçilmedi";

  const gameText =
    session.game
      ? GAMES[session.game].name
      : "Henüz seçilmedi";

  const cpuText =
    session.cpu === "amd"
      ? "AMD"
      : "Intel";

  const gpuText =
    session.gpu === "nvidia"
      ? "NVIDIA"
      : "AMD";

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🖥️ PC TOPLA")
      .setDescription(
        "Aşağıdaki seçenekleri belirle.\n" +
        "Her seçim sadece paneli günceller.\n\n" +
        "Hazır olduğunda **PC'Yİ OLUŞTUR** butonuna bas."
      )
      .addFields(
        {
          name: "💰 Bütçe",
          value: budgetText,
          inline: true
        },
        {
          name: "🎮 Oyun",
          value: gameText,
          inline: true
        },
        {
          name: "🧠 CPU",
          value: cpuText,
          inline: true
        },
        {
          name: "🎮 GPU",
          value: gpuText,
          inline: true
        }
      )
      .setFooter({
        text:
          "ReefAPI yalnızca güncel fiyatları arar."
      });

  const row1 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("budget")
          .setLabel("💰 Bütçe")
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId("game")
          .setLabel("🎮 Oyun")
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId("cpu")
          .setLabel(
            `🧠 CPU: ${cpuText}`
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId("gpu")
          .setLabel(
            `🎮 GPU: ${gpuText}`
          )
          .setStyle(
            ButtonStyle.Secondary
          )
      );

  const row2 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("create")
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

/*
=========================================================
SLASH COMMAND
=========================================================
*/

const commands = [
  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription(
      "Bütçene ve oyununa göre PC oluştur."
    )
    .toJSON()
];

const rest =
  new REST({
    version: "10"
  }).setToken(
    DISCORD_TOKEN
  );

/*
=========================================================
READY
=========================================================
*/

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
        "✅ /pctopla kaydedildi."
      );

    } catch (error) {

      console.error(
        "❌ Slash komut hatası:",
        error
      );
    }
  }
);

/*
=========================================================
INTERACTION
=========================================================
*/

client.on(
  "interactionCreate",
  async interaction => {

    try {

      /*
      =====================================================
      /pctopla
      =====================================================
      */

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "pctopla"
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
          createPanel(session)
        );

        return;
      }

      /*
      =====================================================
      BUTON
      =====================================================
      */

      if (interaction.isButton()) {

        const session =
          sessions.get(
            interaction.user.id
          );

        if (!session) {

          await interaction.reply({
            content:
              "❌ Oturum süresi dolmuş. `/pctopla` ile yeniden başla.",
            ephemeral: true
          });

          return;
        }

        /*
        BÜTÇE
        */

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
                "Bütçe (TL)"
              )
              .setPlaceholder(
                "Örn: 75000"
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

        /*
        OYUN
        */

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
                    emoji: "🎮"
                  })
                )
              );

          await interaction.reply({
            content:
              "🎮 **Oynayacağın oyunu seç:**",
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

        /*
        CPU
        */

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
                "🧠 İşlemci markası"
              )
              .addOptions(
                {
                  label: "AMD",
                  value: "amd",
                  emoji: "🔴"
                },
                {
                  label: "Intel",
                  value: "intel",
                  emoji: "🔵"
                }
              );

          await interaction.reply({
            content:
              "🧠 **İşlemci markasını seç:**",
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

        /*
        GPU
        */

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
                "🎮 Ekran kartı markası"
              )
              .addOptions(
                {
                  label: "NVIDIA",
                  value: "nvidia",
                  emoji: "🟢"
                },
                {
                  label: "AMD",
                  value: "amd",
                  emoji: "🔴"
                }
              );

          await interaction.reply({
            content:
              "🎮 **Ekran kartı markasını seç:**",
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

        /*
        ===================================================
        PC OLUŞTUR
        ===================================================
        */

        if (
          interaction.customId ===
          "create"
        ) {

          if (!session.budget) {

            await interaction.reply({
              content:
                "💰 Önce bütçeni seç.",
              ephemeral: true
            });

            return;
          }

          if (!session.game) {

            await interaction.reply({
              content:
                "🎮 Önce oyun seç.",
              ephemeral: true
            });

            return;
          }

          /*
          API işlemi başlıyor.
          */

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xf1c40f)
                .setTitle(
                  "🔎 SİSTEM OLUŞTURULUYOR..."
                )
                .setDescription(
                  `💰 **Bütçe:** ${money(
                    session.budget
                  )}\n` +

                  `🎮 **Oyun:** ${
                    GAMES[
                      session.game
                    ].name
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

                  "🧠 Uygun parçalar hesaplanıyor...\n" +
                  "🛒 ReefAPI'den canlı fiyatlar aranıyor...\n" +
                  "🔧 Parçalar kontrol ediliyor...\n" +
                  "💰 Bütçe hesaplanıyor..."
                )
            ],
            components: []
          });

          const result =
            await makeBuild(
              session
            );

          /*
          Sistem bulunamadı.
          */

          if (!result) {

            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(
                    0xed4245
                  )
                  .setTitle(
                    "😔 UYGUN SİSTEM BULUNAMADI"
                  )
                  .setDescription(
                    `**${money(
                      session.budget
                    )}** bütçeye uygun ` +
                    "canlı fiyatlı bir sistem bulunamadı.\n\n" +

                    `Maksimum tolerans: **${money(
                      getMaxBudget(
                        session.budget
                      )
                    )}**`
                  )
                  .setFooter({
                    text:
                      "ReefAPI sonuçlarında yeterli uygun ürün bulunamadı."
                  })
              ],
              components: []
            });

            return;
          }

          /*
          =================================================
          SONUÇ
          =================================================
          */

          const difference =
            result.total -
            session.budget;

          let differenceText;

          if (difference > 0) {
            differenceText =
              `📈 Bütçenin **${money(
                difference
              )}** üzerinde`;
          } else {
            differenceText =
              `🟢 Bütçenin **${money(
                Math.abs(difference)
              )}** altında`;
          }

          const embed =
            new EmbedBuilder()
              .setColor(
                difference > 0
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

                `💵 **Toplam:** ${
                  money(
                    result.total
                  )
                }\n` +

                `${differenceText}`
              );

          /*
          Parçaları ekle.
          */

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
                `🏪 ${
                  product.brand
                }\n` +
                (
                  product.url
                    ? `[🛒 Ürünü görüntüle](${product.url})`
                    : "🔗 Ürün linki bulunamadı"
                ),
              inline: false
            });
          }

          /*
          120K mizahı.
          */

          if (
            session.budget >=
            120000
          ) {

            embed.addFields({
              name:
                "💀 120K+ Bölgesi",
              value:
                "Bu bütçede ekran kartı artık sistemin patronu.",
              inline: false
            });
          }

          embed.setFooter({
            text:
              "PC Builder • ReefAPI canlı fiyat"
          });

          await interaction.editReply({
            embeds: [embed],
            components: []
          });

          /*
          İş bittikten sonra session temizle.
          */

          sessions.delete(
            interaction.user.id
          );

          return;
        }
      }

      /*
      =====================================================
      SELECT MENÜ
      =====================================================
      */

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

        /*
        OYUN
        */

        if (
          interaction.customId ===
          "game_select"
        ) {

          session.game =
            interaction.values[0];

          await interaction.update({
            content:
              `✅ **Oyun seçildi:** ${
                GAMES[
                  session.game
                ].name
              }`,
            components: []
          });

          /*
          Ana paneli ayrıca güncelle.
          */

          try {

            await interaction.message.channel.messages
              .fetch(interaction.message.id);

          } catch {}

          return;
        }

        /*
        CPU
        */

        if (
          interaction.customId ===
          "cpu_select"
        ) {

          session.cpu =
            interaction.values[0];

          await interaction.update({
            content:
              `✅ **CPU seçildi:** ${
                session.cpu === "amd"
                  ? "AMD"
                  : "Intel"
              }`,
            components: []
          });

          return;
        }

        /*
        GPU
        */

        if (
          interaction.customId ===
          "gpu_select"
        ) {

          session.gpu =
            interaction.values[0];

          await interaction.update({
            content:
              `✅ **GPU seçildi:** ${
                session.gpu === "nvidia"
                  ? "NVIDIA"
                  : "AMD"
              }`,
            components: []
          });

          return;
        }
      }

      /*
      =====================================================
      MODAL
      =====================================================
      */

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
          Math.floor(budget);

        await interaction.reply({
          content:
            `✅ Bütçe **${money(
              budget
            )}** olarak ayarlandı.`,
          ephemeral: true
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

/*
=========================================================
LOGIN
=========================================================
*/

client.login(
  DISCORD_TOKEN
);