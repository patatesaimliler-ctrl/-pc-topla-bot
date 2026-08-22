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

if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN eksik");
if (!REEF_KEY) throw new Error("REEF_KEY eksik");

const sessions = new Map();

/* =========================================================
   OYUN PROFİLLERİ
========================================================= */

const GAMES = {
  valorant: {
    name: "VALORANT",
    weightCPU: 1.25,
    weightGPU: 0.80
  },

  cs2: {
    name: "CS2",
    weightCPU: 1.20,
    weightGPU: 0.90
  },

  minecraft: {
    name: "Minecraft",
    weightCPU: 1.15,
    weightGPU: 0.90
  },

  fortnite: {
    name: "Fortnite",
    weightCPU: 1.00,
    weightGPU: 1.05
  },

  gta5: {
    name: "GTA V",
    weightCPU: 0.95,
    weightGPU: 1.10
  },

  rdr2: {
    name: "Red Dead Redemption 2",
    weightCPU: 0.90,
    weightGPU: 1.25
  },

  fc: {
    name: "EA SPORTS FC",
    weightCPU: 1.00,
    weightGPU: 1.00
  },

  cyberpunk: {
    name: "Cyberpunk 2077",
    weightCPU: 0.85,
    weightGPU: 1.40
  }
};

/* =========================================================
   PARÇA HAVUZU
========================================================= */

const CPU = {
  amd: [
    {
      name: "Ryzen 5 5500",
      query: "AMD Ryzen 5 5500",
      tier: 1,
      priceShare: 0.18
    },
    {
      name: "Ryzen 5 5600",
      query: "AMD Ryzen 5 5600",
      tier: 2,
      priceShare: 0.20
    },
    {
      name: "Ryzen 5 7500F",
      query: "AMD Ryzen 5 7500F",
      tier: 3,
      priceShare: 0.20
    },
    {
      name: "Ryzen 5 7600",
      query: "AMD Ryzen 5 7600",
      tier: 4,
      priceShare: 0.22
    },
    {
      name: "Ryzen 7 7800X3D",
      query: "AMD Ryzen 7 7800X3D",
      tier: 5,
      priceShare: 0.25
    }
  ],

  intel: [
    {
      name: "Intel Core i3-12100F",
      query: "Intel Core i3 12100F",
      tier: 1,
      priceShare: 0.18
    },
    {
      name: "Intel Core i5-12400F",
      query: "Intel Core i5 12400F",
      tier: 2,
      priceShare: 0.20
    },
    {
      name: "Intel Core i5-14400F",
      query: "Intel Core i5 14400F",
      tier: 3,
      priceShare: 0.21
    },
    {
      name: "Intel Core i5-14600KF",
      query: "Intel Core i5 14600KF",
      tier: 4,
      priceShare: 0.24
    },
    {
      name: "Intel Core i7-14700F",
      query: "Intel Core i7 14700F",
      tier: 5,
      priceShare: 0.27
    }
  ]
};

const GPU = {
  nvidia: [
    {
      name: "RTX 3050 8GB",
      query: "RTX 3050 8GB",
      tier: 1,
      priceShare: 0.30
    },
    {
      name: "RTX 4060 8GB",
      query: "RTX 4060 8GB",
      tier: 2,
      priceShare: 0.32
    },
    {
      name: "RTX 4060 Ti 8GB",
      query: "RTX 4060 Ti 8GB",
      tier: 3,
      priceShare: 0.35
    },
    {
      name: "RTX 5070 12GB",
      query: "RTX 5070 12GB",
      tier: 4,
      priceShare: 0.40
    },
    {
      name: "RTX 5070 Ti 16GB",
      query: "RTX 5070 Ti 16GB",
      tier: 5,
      priceShare: 0.44
    },
    {
      name: "RTX 5080 16GB",
      query: "RTX 5080 16GB",
      tier: 6,
      priceShare: 0.50
    }
  ],

  amd: [
    {
      name: "RX 6600 8GB",
      query: "RX 6600 8GB",
      tier: 1,
      priceShare: 0.29
    },
    {
      name: "RX 7600 8GB",
      query: "RX 7600 8GB",
      tier: 2,
      priceShare: 0.31
    },
    {
      name: "RX 7700 XT 12GB",
      query: "RX 7700 XT 12GB",
      tier: 3,
      priceShare: 0.35
    },
    {
      name: "RX 7800 XT 16GB",
      query: "RX 7800 XT 16GB",
      tier: 4,
      priceShare: 0.40
    },
    {
      name: "RX 9070 XT 16GB",
      query: "RX 9070 XT 16GB",
      tier: 5,
      priceShare: 0.44
    },
    {
      name: "RX 7900 XTX 24GB",
      query: "RX 7900 XTX 24GB",
      tier: 6,
      priceShare: 0.50
    }
  ]
};

/* =========================================================
   REEFAPI
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
    []
  );
}

/* =========================================================
   ÜRÜN FİYATI
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
      const n = Number(
        value
          .replace(/[^\d,.-]/g, "")
          .replace(/\./g, "")
          .replace(",", ".")
      );

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
   ÜRÜN DOĞRULAMA
========================================================= */

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

function validProduct(title, type) {
  const t = normalize(title);

  if (type === "cpu") {
    return (
      t.includes("ryzen") ||
      t.includes("core i") ||
      t.includes("core ultra")
    );
  }

  if (type === "gpu") {
    return (
      t.includes("rtx ") ||
      t.includes("rx ") ||
      t.includes("geforce") ||
      t.includes("radeon")
    );
  }

  if (type === "ram") {
    return (
      t.includes("ram") &&
      (t.includes("ddr4") || t.includes("ddr5"))
    );
  }

  if (type === "ssd") {
    return (
      t.includes("ssd") &&
      !t.includes("kutu") &&
      !t.includes("adapt")
    );
  }

  if (type === "motherboard") {
    return (
      t.includes("anakart") ||
      t.includes("motherboard") ||
      t.includes("b550") ||
      t.includes("b650") ||
      t.includes("b760") ||
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
    return (
      t.includes("kasa") ||
      t.includes("pc case") ||
      t.includes("gaming case")
    );
  }

  return true;
}

/* =========================================================
   REEF'TEN FİYAT BUL
========================================================= */

async function findPrice(query, type, maxPrice) {
  const results = await reefSearch(query);

  const products = results
    .map(product => ({
      title: getTitle(product),
      price: getPrice(product),
      url: getUrl(product),
      brand: product.brand || product.merchantName || "Trendyol"
    }))
    .filter(product =>
      product.price &&
      product.price <= maxPrice &&
      validProduct(product.title, type)
    )
    .sort((a, b) => a.price - b.price);

  return products[0] || null;
}

/* =========================================================
   UYUMLULUK
========================================================= */

function platformForCPU(cpu) {
  if (cpu.includes("7500F") || cpu.includes("7600") ||
      cpu.includes("7800X3D")) {
    return "am5";
  }

  if (cpu.includes("5500") || cpu.includes("5600")) {
    return "am4";
  }

  if (cpu.includes("12100") || cpu.includes("12400")) {
    return "lga1700";
  }

  if (
    cpu.includes("14400") ||
    cpu.includes("14600") ||
    cpu.includes("14700")
  ) {
    return "lga1700";
  }

  return "am5";
}

/* =========================================================
   OYUNA GÖRE TIER
========================================================= */

function targetTier(budget, game) {
  const profile = GAMES[game];

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

  if (profile.weightGPU >= 1.25) {
    tier += 0.5;
  }

  if (profile.weightCPU >= 1.20) {
    tier += 0.25;
  }

  return Math.min(6, Math.max(1, tier));
}

/* =========================================================
   ADAY SİSTEM
========================================================= */

function buildCandidate(session, cpu, gpu) {
  const budget = session.budget;

  const platform = platformForCPU(cpu.name);

  const cpuPriceLimit =
    Math.floor(budget * cpu.priceShare);

  const gpuPriceLimit =
    Math.floor(budget * gpu.priceShare);

  let ram;

  if (platform === "am4" || budget < 50000) {
    ram = {
      query: "16GB DDR4 3200 RAM",
      type: "ram",
      max: Math.floor(budget * 0.09)
    };
  } else {
    ram = {
      query: "32GB DDR5 6000 RAM",
      type: "ram",
      max: Math.floor(budget * 0.10)
    };
  }

  const ssd = {
    query: budget >= 60000
      ? "1TB NVMe SSD"
      : "500GB NVMe SSD",
    type: "ssd",
    max: Math.floor(budget * 0.08)
  };

  let motherboard;

  if (platform === "am4") {
    motherboard = {
      query: "B550 DDR4 anakart",
      type: "motherboard",
      max: Math.floor(budget * 0.10)
    };
  } else if (platform === "am5") {
    motherboard = {
      query: "B650 DDR5 anakart",
      type: "motherboard",
      max: Math.floor(budget * 0.11)
    };
  } else {
    motherboard = {
      query: "B760 DDR5 anakart",
      type: "motherboard",
      max: Math.floor(budget * 0.11)
    };
  }

  const psu = {
    query:
      gpu.tier >= 5
        ? "850W 80 Plus Gold PSU"
        : gpu.tier >= 3
          ? "750W 80 Plus Gold PSU"
          : "650W 80 Plus Bronze PSU",
    type: "psu",
    max: Math.floor(budget * 0.10)
  };

  const pcCase = {
    query: "Mesh Airflow ATX Gaming Kasa",
    type: "case",
    max: Math.floor(budget * 0.09)
  };

  return {
    cpu: {
      query: cpu.query,
      type: "cpu",
      max: cpuPriceLimit
    },

    gpu: {
      query: gpu.query,
      type: "gpu",
      max: gpuPriceLimit
    },

    ram,
    ssd,
    motherboard,
    psu,
    case: pcCase
  };
}

/* =========================================================
   EN UYGUN SİSTEMİ BUL
========================================================= */

async function makeBuild(session) {
  const cpuList = CPU[session.cpu];
  const gpuList = GPU[session.gpu];

  const wanted = targetTier(
    session.budget,
    session.game
  );

  const combinations = [];

  for (const cpu of cpuList) {
    for (const gpu of gpuList) {
      const distance =
        Math.abs(cpu.tier - wanted) +
        Math.abs(gpu.tier - wanted);

      combinations.push({
        cpu,
        gpu,
        distance
      });
    }
  }

  combinations.sort(
    (a, b) => a.distance - b.distance
  );

  /*
   * En mantıklı 5 kombinasyonu deniyoruz.
   * Her kombinasyonda Reef sadece fiyat arıyor.
   */

  for (const candidate of combinations.slice(0, 5)) {
    try {
      const plan =
        buildCandidate(
          session,
          candidate.cpu,
          candidate.gpu
        );

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
          plan.cpu.type,
          plan.cpu.max
        ),

        findPrice(
          plan.gpu.query,
          plan.gpu.type,
          plan.gpu.max
        ),

        findPrice(
          plan.ram.query,
          plan.ram.type,
          plan.ram.max
        ),

        findPrice(
          plan.ssd.query,
          plan.ssd.type,
          plan.ssd.max
        ),

        findPrice(
          plan.motherboard.query,
          plan.motherboard.type,
          plan.motherboard.max
        ),

        findPrice(
          plan.psu.query,
          plan.psu.type,
          plan.psu.max
        ),

        findPrice(
          plan.case.query,
          plan.case.type,
          plan.case.max
        )
      ]);

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
        ["🧠 İşlemci", cpu],
        ["🎮 Ekran Kartı", gpu],
        ["🧩 RAM", ram],
        ["💾 SSD", ssd],
        ["🔧 Anakart", motherboard],
        ["⚡ PSU", psu],
        ["📦 Kasa", pcCase]
      ];

      const total = parts.reduce(
        (sum, [, product]) =>
          sum + product.price,
        0
      );

      /*
       * SERT BÜTÇE KİLİDİ
       */

      if (total <= session.budget) {
        return {
          parts,
          total,
          cpu: candidate.cpu.name,
          gpu: candidate.gpu.name
        };
      }

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
   ANA PANEL
========================================================= */

function panel(session) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🖥️ PC TOPLA")
    .setDescription(
      "Aşağıdaki seçenekleri belirle, ardından " +
      "**PC'Yİ OLUŞTUR** butonuna bas.\n\n" +

      `💰 **Bütçe:** ${
        session.budget
          ? money(session.budget)
          : "Seçilmedi"
      }\n` +

      `🎮 **Oyun:** ${
        session.game
          ? GAMES[session.game].name
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
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("budget")
        .setLabel("💰 Bütçe")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("game")
        .setLabel("🎮 Oyun")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("cpu")
        .setLabel(
          session.cpu === "amd"
            ? "🧠 AMD"
            : "🧠 Intel"
        )
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("gpu")
        .setLabel(
          session.gpu === "nvidia"
            ? "🎮 NVIDIA"
            : "🎮 AMD"
        )
        .setStyle(ButtonStyle.Secondary)
    );

  const row2 =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create")
        .setLabel("🚀 PC'Yİ OLUŞTUR")
        .setStyle(ButtonStyle.Success)
    );

  return {
    embeds: [embed],
    components: [row1, row2]
  };
}

/* =========================================================
   PARA
========================================================= */

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

/* =========================================================
   SLASH COMMAND
========================================================= */

const commands = [
  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription(
      "Bütçene ve oyununa göre PC oluştur."
    )
].map(command => command.toJSON());

const rest =
  new REST({ version: "10" })
    .setToken(DISCORD_TOKEN);

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {
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
});

/* =========================================================
   INTERACTION
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    try {

      /* /pctopla */

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
          panel(session)
        );

        return;
      }

      /* BUTON */

      if (interaction.isButton()) {

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
              .setCustomId("budget_modal")
              .setTitle("💰 Bütçeni Gir");

          const input =
            new TextInputBuilder()
              .setCustomId("budget_input")
              .setLabel(
                "Maksimum bütçe (TL)"
              )
              .setPlaceholder(
                "Örn: 50000"
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(true);

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(input)
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
                Object.entries(GAMES)
                  .map(
                    ([value, game]) => ({
                      label: game.name,
                      value,
                      emoji: "🎮"
                    })
                  )
              );

          await interaction.reply({
            content:
              "🎮 Oynayacağın oyunu seç:",
            components: [
              new ActionRowBuilder()
                .addComponents(menu)
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
                  label: "AMD",
                  value: "amd"
                },
                {
                  label: "Intel",
                  value: "intel"
                }
              );

          await interaction.reply({
            content:
              "🧠 İşlemci markasını seç:",
            components: [
              new ActionRowBuilder()
                .addComponents(menu)
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
                  label: "NVIDIA",
                  value: "nvidia"
                },
                {
                  label: "AMD",
                  value: "amd"
                }
              );

          await interaction.reply({
            content:
              "🎮 Ekran kartı markasını seç:",
            components: [
              new ActionRowBuilder()
                .addComponents(menu)
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

          if (!session.budget) {
            await interaction.reply({
              content:
                "💰 Önce bütçeni gir.",
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

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xf1c40f)
                .setTitle(
                  "🔎 PC ARAŞTIRILIYOR..."
                )
                .setDescription(
                  `🎮 **${GAMES[session.game].name}**\n` +
                  `💰 **${money(session.budget)}**\n\n` +
                  "🧠 Uygun parçalar hesaplanıyor...\n" +
                  "🛒 ReefAPI'den canlı fiyatlar alınıyor...\n" +
                  "🔧 Uyumluluk kontrol ediliyor...\n" +
                  "💰 Bütçe kontrol ediliyor..."
                )
            ],
            components: []
          });

          const result =
            await makeBuild(session);

          if (!result) {

            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xed4245)
                  .setTitle(
                    "❌ UYGUN SİSTEM BULUNAMADI"
                  )
                  .setDescription(
                    "Bu bütçeye uygun tüm parçaları " +
                    "canlı fiyatlarla bulamadım.\n\n" +
                    "💡 Biraz daha yüksek bütçe " +
                    "veya farklı bir marka deneyebilirsin."
                  )
              ],
              components: []
            });

            return;
          }

          const embed =
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle(
                "🚀 PC HAZIR!"
              )
              .setDescription(
                `🎮 **Oyun:** ${
                  GAMES[session.game].name
                }\n` +

                `🧠 **İşlemci:** ${
                  result.cpu
                }\n` +

                `🎮 **Ekran kartı:** ${
                  result.gpu
                }\n\n` +

                `💰 **Bütçe:** ${
                  money(session.budget)
                }\n` +

                `💵 **Toplam:** ${
                  money(result.total)
                }\n` +

                `🟢 **Kalan:** ${
                  money(
                    session.budget -
                    result.total
                  )
                }`
              );

          for (
            const [name, product]
            of result.parts
          ) {

            embed.addFields({
              name,
              value:
                `**${product.title}**\n` +
                `💰 ${money(product.price)}\n` +
                `🏪 ${product.brand}\n` +
                (
                  product.url
                    ? `[🛒 Ürüne git](${product.url})`
                    : "🔗 Link bulunamadı"
                ),
              inline: false
            });
          }

          if (
            session.budget >= 120000
          ) {
            embed.addFields({
              name:
                "💀 120K+ Bölgesi",
              value:
                "Bu bütçede ekran kartı artık sistemin patronu.",
              inline: false
            });
          }

          await interaction.editReply({
            embeds: [embed],
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
              `✅ Oyun: **${GAMES[session.game].name}**`,
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
                session.cpu === "amd"
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
                session.gpu === "nvidia"
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

        const raw =
          interaction.fields
            .getTextInputValue(
              "budget_input"
            );

        const budget =
          Number(
            raw.replace(/\D/g, "")
          );

        if (
          !Number.isFinite(budget) ||
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
            `✅ Bütçe **${money(budget)}** olarak ayarlandı.`,
          ephemeral: true
        });

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

client.login(DISCORD_TOKEN);