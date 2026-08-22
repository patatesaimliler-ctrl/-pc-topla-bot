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


/* =====================================================
   KOMUT
===================================================== */

const commands = [
  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription("Bütçene ve oyununa göre PC oluştur.")
].map(x => x.toJSON());


const rest = new REST({
  version: "10"
}).setToken(DISCORD_TOKEN);


/* =====================================================
   GEÇİCİ KULLANICI AYARLARI
===================================================== */

const sessions = new Map();


function newSession(userId) {
  return {
    userId,
    budget: null,
    game: null,
    package: "case",
    cpuBrand: "amd",
    gpuBrand: "nvidia"
  };
}


/* =====================================================
   PARA
===================================================== */

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}


/* =====================================================
   REEFAPI
===================================================== */

async function trendyolSearch(query, priceRange = null) {

  const body = {
    query,
    page: 1,
    max_pages: 1
  };

  if (priceRange) {
    body.price = priceRange;
  }

  const response = await fetch(
    "https://api.reefapi.com/trendyol/v1/search",
    {
      method: "POST",
      headers: {
        "x-api-key": REEF_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const json = await response.json();

  if (!response.ok || json.ok === false) {
    console.error("REEF API:", json);
    throw new Error(
      json?.error?.message ||
      `ReefAPI HTTP ${response.status}`
    );
  }

  return json?.data?.results || [];
}


/* =====================================================
   FİYAT
===================================================== */

function getPrice(product) {

  const p = product?.price;

  if (typeof p === "number") {
    return p;
  }

  if (typeof p === "string") {

    const n = Number(
      p
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );

    return Number.isFinite(n) ? n : null;
  }

  if (p && typeof p === "object") {

    const values = [
      p.current,
      p.value,
      p.amount,
      p.selling,
      p.discounted,
      p.sale
    ];

    for (const value of values) {

      if (typeof value === "number") {
        return value;
      }

      if (typeof value === "string") {

        const n = Number(
          value
            .replace(/[^\d,.-]/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
        );

        if (Number.isFinite(n)) {
          return n;
        }
      }
    }
  }

  return null;
}


/* =====================================================
   ÜRÜN HAZIRLA
===================================================== */

function prepareProducts(
  results,
  keywords,
  badWords = []
) {

  const products = [];

  for (const item of results) {

    const title =
      String(item?.title || "").trim();

    const url =
      item?.url;

    const price =
      getPrice(item);

    if (!title || !url) continue;

    if (
      price === null ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      continue;
    }

    const lower =
      title.toLowerCase();

    let score = 0;

    for (const keyword of keywords) {

      if (
        lower.includes(
          keyword.toLowerCase()
        )
      ) {
        score += 100;
      }
    }

    for (const bad of badWords) {

      if (
        lower.includes(
          bad.toLowerCase()
        )
      ) {
        score -= 1000;
      }
    }

    products.push({
      title,
      url,
      price,
      score
    });
  }

  products.sort((a, b) => {

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.price - b.price;
  });

  const unique = [];
  const seen = new Set();

  for (const product of products) {

    const key =
      product.title
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(product);

    if (unique.length >= 10) {
      break;
    }
  }

  return unique;
}


/* =====================================================
   PARÇA ARAMA
===================================================== */

async function searchPart(
  query,
  keywords,
  badWords = [],
  budgetLimit = null
) {

  /*
    Aramayı gereksiz pahalı ürünlerle
    doldurmamak için fiyat filtresi.
  */

  let priceRange = null;

  if (budgetLimit) {
    priceRange = `0-${Math.floor(budgetLimit)}`;
  }

  const results =
    await trendyolSearch(
      query,
      priceRange
    );

  return prepareProducts(
    results,
    keywords,
    badWords
  );
}


/* =====================================================
   OYUNLAR
===================================================== */

const games = {
  valorant: {
    name: "VALORANT",
    cpu: "cpu",
    gpu: 1.25
  },

  cs2: {
    name: "Counter-Strike 2",
    cpu: "cpu",
    gpu: 1.30
  },

  fortnite: {
    name: "Fortnite",
    cpu: "balanced",
    gpu: 1.35
  },

  minecraft: {
    name: "Minecraft",
    cpu: 1.25,
    gpu: 1.10
  },

  gtav: {
    name: "GTA V",
    cpu: 1.10,
    gpu: 1.25
  },

  rdr2: {
    name: "Red Dead Redemption 2",
    cpu: 0.90,
    gpu: 1.50
  },

  fc26: {
    name: "FC 26",
    cpu: 1.00,
    gpu: 1.20
  },

  genel: {
    name: "Genel Oyun",
    cpu: 1,
    gpu: 1
  }
};


/* =====================================================
   OYUN SEÇİMİ
===================================================== */

function gameMenu() {

  return new ActionRowBuilder()
    .addComponents(

      new StringSelectMenuBuilder()
        .setCustomId("game_select")
        .setPlaceholder("🎮 Oynayacağın oyunu seç")
        .addOptions(

          {
            label: "VALORANT",
            value: "valorant",
            emoji: "🎯"
          },

          {
            label: "Counter-Strike 2",
            value: "cs2",
            emoji: "🔫"
          },

          {
            label: "Fortnite",
            value: "fortnite",
            emoji: "🟣"
          },

          {
            label: "Minecraft",
            value: "minecraft",
            emoji: "⛏️"
          },

          {
            label: "GTA V",
            value: "gtav",
            emoji: "🚗"
          },

          {
            label: "Red Dead Redemption 2",
            value: "rdr2",
            emoji: "🤠"
          },

          {
            label: "FC 26",
            value: "fc26",
            emoji: "⚽"
          },

          {
            label: "Genel Oyun",
            value: "genel",
            emoji: "🎮"
          }
        )
    );
}


/* =====================================================
   ANA MENÜ
===================================================== */

function mainMenu(session) {

  const embed =
    new EmbedBuilder()
      .setTitle("🖥️ PC TOPLA")
      .setDescription(
        "### 🚀 PC Builder\n\n" +
        "Butonlardan seçimlerini yap.\n" +
        "Sonunda sana **bütçeni geçmeyen** bir sistem çıkaracağım.\n\n" +

        `💰 **Bütçe:** ${
          session.budget
            ? money(session.budget)
            : "Henüz seçilmedi"
        }\n` +

        `🎮 **Oyun:** ${
          session.game
            ? games[session.game].name
            : "Henüz seçilmedi"
        }\n` +

        `📦 **Paket:** ${
          session.package === "case"
            ? "🖥️ Sadece Kasa"
            : "🎒 Wraith Full Paket"
        }\n` +

        `🧠 **CPU:** ${session.cpuBrand.toUpperCase()}\n` +
        `🎮 **GPU:** ${session.gpuBrand.toUpperCase()}`
      )
      .setFooter({
        text: "PC Builder • Canlı Trendyol fiyatları"
      });


  const row1 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("budget")
          .setLabel("💰 Bütçe")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("package")
          .setLabel(
            session.package === "case"
              ? "🖥️ Sadece Kasa"
              : "🎒 Wraith Full Paket"
          )
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("cpu")
          .setLabel(
            `🧠 CPU: ${session.cpuBrand.toUpperCase()}`
          )
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("gpu")
          .setLabel(
            `🎮 GPU: ${session.gpuBrand.toUpperCase()}`
          )
          .setStyle(ButtonStyle.Secondary)
      );


  const row2 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("build")
          .setLabel("🚀 PC'Yİ OLUŞTUR")
          .setStyle(ButtonStyle.Success)
      );


  return {
    embeds: [embed],
    components: [
      row1,
      gameMenu(),
      row2
    ]
  };
}


/* =====================================================
   BÜTÇE MODAL
===================================================== */

function budgetModal() {

  const modal =
    new ModalBuilder()
      .setCustomId("budget_modal")
      .setTitle("💰 PC Bütçesi");


  const input =
    new TextInputBuilder()
      .setCustomId("budget_input")
      .setLabel("Maksimum bütçen kaç TL?")
      .setPlaceholder("Örn: 80000")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(4)
      .setMaxLength(7);


  modal.addComponents(
    new ActionRowBuilder()
      .addComponents(input)
  );

  return modal;
}


/* =====================================================
   PAKET SEÇİMİ
===================================================== */

function packageMenu() {

  return new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId("package_case")
        .setLabel("🖥️ Sadece Kasa")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("package_full")
        .setLabel("🎒 Wraith Full Paket")
        .setStyle(ButtonStyle.Success)
    );
}


/* =====================================================
   MARKA MENÜSÜ
===================================================== */

function cpuMenu() {

  return new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId("cpu_amd")
        .setLabel("AMD")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("cpu_intel")
        .setLabel("Intel")
        .setStyle(ButtonStyle.Secondary)
    );
}


function gpuMenu() {

  return new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId("gpu_nvidia")
        .setLabel("NVIDIA")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("gpu_amd")
        .setLabel("AMD")
        .setStyle(ButtonStyle.Secondary)
    );
}


/* =====================================================
   WRAITH EKİPMANLARI
===================================================== */

async function getEquipmentCandidates(
  budget
) {

  /*
    Full paket için:
    klavye
    mouse
    kulaklık
    mousepad

    Wraith araması.
  */

  const equipmentBudget =
    Math.max(
      3000,
      Math.floor(budget * 0.15)
    );


  const perItem =
    Math.floor(
      equipmentBudget / 4
    );


  const [
    keyboard,
    mouse,
    headset,
    mousepad
  ] = await Promise.all([

    searchPart(
      "Wraith gaming klavye",
      ["wraith", "klavye"],
      ["laptop"],
      perItem
    ),

    searchPart(
      "Wraith gaming mouse",
      ["wraith", "mouse"],
      ["mousepad", "klavye"],
      perItem
    ),

    searchPart(
      "Wraith gaming kulaklık",
      ["wraith", "kulaklık"],
      ["stand", "mikrofon kolu"],
      perItem
    ),

    searchPart(
      "Wraith mousepad",
      ["wraith", "mousepad"],
      ["masa", "deskmat"],
      perItem
    )

  ]);


  return {
    keyboard,
    mouse,
    headset,
    mousepad
  };
}


/* =====================================================
   BÜTÇEYE UYGUN SİSTEM
===================================================== */

function findBestCombination(
  candidates,
  budget,
  game
) {

  const names = [
    "cpu",
    "gpu",
    "ram",
    "ssd",
    "motherboard",
    "psu",
    "case"
  ];


  for (const name of names) {

    if (
      !candidates[name] ||
      candidates[name].length === 0
    ) {
      return null;
    }
  }


  /*
    Aday sayısını sınırlıyoruz.
    Böylece milyonlarca kombinasyon
    oluşmuyor.
  */

  const lists =
    names.map(
      name =>
        candidates[name].slice(0, 8)
    );


  let best = null;


  /*
    GPU ağırlığını oyuna göre belirle.
  */

  const gpuWeight =
    game?.gpu || 1;


  const cpuWeight =
    game?.cpu === "cpu"
      ? 1.20
      : game?.cpu === "balanced"
        ? 1.10
        : 1.00;


  /*
    Recursive search.
  */

  function search(
    index,
    current,
    total
  ) {

    if (total > budget) {
      return;
    }


    if (index === names.length) {

      if (total > budget) {
        return;
      }


      const budgetUsage =
        total / budget;


      const cpuScore =
        current.cpu.price *
        cpuWeight;


      const gpuScore =
        current.gpu.price *
        gpuWeight;


      /*
        Bütçeye yaklaşırken
        GPU'ya biraz daha önem veriyoruz.
      */

      const score =
        budgetUsage * 100000 +
        cpuScore * 0.05 +
        gpuScore * 0.10;


      if (
        !best ||
        score > best.score
      ) {

        best = {
          system: {
            ...current
          },
          total,
          score
        };
      }

      return;
    }


    const name =
      names[index];


    for (
      const product of lists[index]
    ) {

      const newTotal =
        total + product.price;


      if (
        newTotal > budget
      ) {
        continue;
      }


      current[name] =
        product;


      search(
        index + 1,
        current,
        newTotal
      );
    }
  }


  search(
    0,
    {},
    0
  );


  return best;
}


/* =====================================================
   FULL PAKET BÜTÇE KONTROLÜ
===================================================== */

function addEquipment(
  system,
  equipment
) {

  return {
    ...system,

    equipment: {
      keyboard:
        equipment.keyboard[0],

      mouse:
        equipment.mouse[0],

      headset:
        equipment.headset[0],

      mousepad:
        equipment.mousepad[0]
    }
  };
}


/* =====================================================
   EKİPMAN TOPLAM
===================================================== */

function equipmentTotal(equipment) {

  return (
    equipment.keyboard.price +
    equipment.mouse.price +
    equipment.headset.price +
    equipment.mousepad.price
  );
}


/* =====================================================
   /PCTOPLA
===================================================== */

client.once(
  "ready",
  async () => {

    console.log(
      `🟢 ${client.user.tag} aktif!`
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
        "🟢 /pctopla kaydedildi!"
      );

    } catch (error) {

      console.error(
        "Slash komut hatası:",
        error
      );
    }
  }
);


/* =====================================================
   INTERACTIONS
===================================================== */

client.on(
  "interactionCreate",
  async interaction => {

    /* =========================
       KOMUT
    ========================= */

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "pctopla"
    ) {

      const session =
        newSession(
          interaction.user.id
        );


      sessions.set(
        interaction.user.id,
        session
      );


      await interaction.reply(
        mainMenu(session)
      );

      return;
    }


    /* =========================
       SELECT MENU
    ========================= */

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
            "❌ Oturumun süresi dolmuş. `/pctopla` ile yeniden başla.",
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


        await interaction.update(
          mainMenu(session)
        );

        return;
      }
    }


    /* =========================
       BUTONLAR
    ========================= */

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


      /* ---------- BÜTÇE ---------- */

      if (
        interaction.customId ===
        "budget"
      ) {

        await interaction.showModal(
          budgetModal()
        );

        return;
      }


      /* ---------- PAKET ---------- */

      if (
        interaction.customId ===
        "package"
      ) {

        await interaction.reply({
          content:
            "📦 **PC paketini seç:**",
          components: [
            packageMenu()
          ],
          ephemeral: true
        });

        return;
      }


      if (
        interaction.customId ===
        "package_case"
      ) {

        session.package =
          "case";


        await interaction.update(
          mainMenu(session)
        );

        return;
      }


      if (
        interaction.customId ===
        "package_full"
      ) {

        session.package =
          "full";


        await interaction.update(
          mainMenu(session)
        );

        return;
      }


      /* ---------- CPU ---------- */

      if (
        interaction.customId ===
        "cpu"
      ) {

        await interaction.reply({
          content:
            "🧠 **İşlemci markasını seç:**",
          components: [
            cpuMenu()
          ],
          ephemeral: true
        });

        return;
      }


      if (
        interaction.customId ===
        "cpu_amd"
      ) {

        session.cpuBrand =
          "amd";


        await interaction.update(
          mainMenu(session)
        );

        return;
      }


      if (
        interaction.customId ===
        "cpu_intel"
      ) {

        session.cpuBrand =
          "intel";


        await interaction.update(
          mainMenu(session)
        );

        return;
      }


      /* ---------- GPU ---------- */

      if (
        interaction.customId ===
        "gpu"
      ) {

        await interaction.reply({
          content:
            "🎮 **Ekran kartı markasını seç:**",
          components: [
            gpuMenu()
          ],
          ephemeral: true
        });

        return;
      }


      if (
        interaction.customId ===
        "gpu_nvidia"
      ) {

        session.gpuBrand =
          "nvidia";


        await interaction.update(
          mainMenu(session)
        );

        return;
      }


      if (
        interaction.customId ===
        "gpu_amd"
      ) {

        session.gpuBrand =
          "amd";


        await interaction.update(
          mainMenu(session)
        );

        return;
      }


      /* ---------- PC OLUŞTUR ---------- */

      if (
        interaction.customId ===
        "build"
      ) {

        if (!session.budget) {

          await interaction.reply({
            content:
              "💰 Önce bütçeni seç!",
            ephemeral: true
          });

          return;
        }


        if (!session.game) {

          await interaction.reply({
            content:
              "🎮 Önce oynayacağın oyunu seç!",
            ephemeral: true
          });

          return;
        }


        await interaction.update({

          embeds: [

            new EmbedBuilder()
              .setTitle(
                "🔎 PC aranıyor..."
              )
              .setDescription(
                "🌐 Trendyol'dan canlı fiyatlar çekiliyor...\n\n" +
                "🧠 İşlemci\n" +
                "🎮 Ekran kartı\n" +
                "🧩 RAM\n" +
                "💾 SSD\n" +
                "🔧 Anakart\n" +
                "⚡ PSU\n" +
                "📦 Kasa"
              )

          ],

          components: []
        });


        try {

          const budget =
            session.budget;


          const game =
            games[
              session.game
            ];


          /* =====================
             CPU
          ===================== */

          const cpuSearch =
            getCpuSearch(
              session.cpuBrand,
              budget
            );


          const gpuSearch =
            getGpuSearch(
              session.gpuBrand,
              budget
            );


          /* =====================
             PARÇA ADAYLARI
          ===================== */

          const [
            cpuCandidates,
            gpuCandidates,
            ramCandidates,
            ssdCandidates,
            motherboardCandidates,
            psuCandidates,
            caseCandidates
          ] = await Promise.all([

            searchPart(
              cpuSearch.query,
              cpuSearch.keywords,
              [],
              budget
            ),

            searchPart(
              gpuSearch.query,
              gpuSearch.keywords,
              [
                "laptop",
                "notebook",
                "hazır sistem"
              ],
              budget
            ),

            searchPart(
              budget < 50000
                ? "16GB DDR5 6000MHz RAM"
                : "32GB DDR5 6000MHz RAM",

              budget < 50000
                ? ["16gb", "ddr5"]
                : ["32gb", "ddr5"],

              [
                "laptop",
                "notebook"
              ],

              budget
            ),

            searchPart(
              budget < 60000
                ? "1TB NVMe SSD"
                : "2TB NVMe SSD",

              budget < 60000
                ? ["1tb", "nvme"]
                : ["2tb", "nvme"],

              [
                "laptop"
              ],

              budget
            ),

            searchPart(
              session.cpuBrand === "amd"
                ? budget < 40000
                  ? "B550 anakart"
                  : "B650 anakart"
                : "B760 anakart",

              session.cpuBrand === "amd"
                ? budget < 40000
                  ? ["b550"]
                  : ["b650"]
                : ["b760"],

              [],

              budget
            ),

            searchPart(
              budget < 60000
                ? "650W 80 Plus Bronze PSU"
                : "750W 80 Plus Gold PSU",

              budget < 60000
                ? ["650w", "80 plus"]
                : ["750w", "80 plus", "gold"],

              [],

              budget
            ),

            searchPart(
              "Mesh ATX Gaming Kasa",
              ["mesh", "atx"],
              [
                "laptop",
                "notebook"
              ],
              budget
            )

          ]);


          const candidates = {

            cpu:
              cpuCandidates,

            gpu:
              gpuCandidates,

            ram:
              ramCandidates,

            ssd:
              ssdCandidates,

            motherboard:
              motherboardCandidates,

            psu:
              psuCandidates,

            case:
              caseCandidates
          };


          /* =====================
             SİSTEM
          ===================== */

          const result =
            findBestCombination(
              candidates,
              budget,
              game
            );


          if (!result) {

            await interaction.editReply({

              embeds: [

                new EmbedBuilder()
                  .setTitle(
                    "❌ Sistem oluşturulamadı"
                  )
                  .setDescription(
                    "Bu bütçeye ve seçtiğin marka/oyun tercihlerine uygun bütün parçaları aynı anda bulamadım."
                  )

              ]

            });

            return;
          }


          /* =====================
             FULL PAKET
          ===================== */

          let finalSystem =
            result.system;

          let finalTotal =
            result.total;

          let equipment = null;


          if (
            session.package ===
            "full"
          ) {

            equipment =
              await getEquipmentCandidates(
                budget - finalTotal
              );


            const equipmentReady =
              equipment.keyboard.length &&
              equipment.mouse.length &&
              equipment.headset.length &&
              equipment.mousepad.length;


            if (equipmentReady) {

              const cheapestEquipment = {

                keyboard:
                  equipment.keyboard[0],

                mouse:
                  equipment.mouse[0],

                headset:
                  equipment.headset[0],

                mousepad:
                  equipment.mousepad[0]

              };


              const extra =
                equipmentTotal(
                  cheapestEquipment
                );


              /*
                FULL PAKET DE BÜTÇEYİ
                ASLA GEÇEMEZ.
              */

              if (
                finalTotal + extra <=
                budget
              ) {

                equipment =
                  cheapestEquipment;

                finalTotal += extra;

              } else {

                /*
                  Ekipman bütçeye sığmıyorsa
                  açıkça söyle.
                */

                await interaction.editReply({

                  embeds: [

                    new EmbedBuilder()
                      .setTitle(
                        "⚠️ Full paket bütçeye sığmadı"
                      )
                      .setDescription(
                        `Kasa sistemi: **${money(finalTotal)}**\n` +
                        `Bütçe: **${money(budget)}**\n\n` +
                        "Wraith ekipmanlarını eklersek bütçe aşılacaktı.\n\n" +
                        "🖥️ **Sadece Kasa** seçeneğini kullanırsan sistemi oluşturabilirim."
                      )

                  ]

                });

                return;
              }
            }
          }


          /* =====================
             SON GÜVENLİK
          ===================== */

          if (
            finalTotal >
            budget
          ) {

            await interaction.editReply({

              embeds: [

                new EmbedBuilder()
                  .setTitle(
                    "🛑 Bütçe koruması"
                  )
                  .setDescription(
                    "Sistem bütçeyi geçtiği için gönderilmedi."
                  )

              ]

            });

            return;
          }


          /* =====================
             EMBED
          ===================== */

          const remaining =
            budget -
            finalTotal;


          let description =
            `🎮 **Oyun:** ${game.name}\n` +
            `💰 **Bütçe:** ${money(budget)}\n` +
            `💵 **Toplam:** ${money(finalTotal)}\n` +
            `💸 **Kalan:** ${money(remaining)}\n\n`;


          /*
            120K üstüne hafif mizah.
          */

          if (
            budget >= 120000
          ) {

            description +=
              "🤑 **120K+ modu aktif.**\n" +
              "Bu bütçede PC toplamıyoruz, küçük çaplı teknoloji holdingi kuruyoruz. 😂\n\n";

          }


          description +=
            session.package === "full"
              ? "🎒 **Wraith Full Paket**"
              : "🖥️ **Sadece Kasa**";


          const embed =
            new EmbedBuilder()
              .setTitle(
                "🖥️ SİSTEM HAZIR"
              )
              .setDescription(
                description
              )
              .setFooter({
                text:
                  "ReefAPI • Trendyol canlı fiyatları • PC Builder"
              });


          /* =====================
             PARÇALAR
          ===================== */

          const parts = [

            ["🧠 İşlemci", finalSystem.cpu],

            ["🎮 Ekran Kartı", finalSystem.gpu],

            ["🧩 RAM", finalSystem.ram],

            ["💾 SSD", finalSystem.ssd],

            ["🔧 Anakart", finalSystem.motherboard],

            ["⚡ PSU", finalSystem.psu],

            ["📦 Kasa", finalSystem.case]

          ];


          for (
            const [name, product]
            of parts
          ) {

            embed.addFields({

              name,

              value:
                `**${product.title}**\n` +
                `💰 **${money(product.price)}**\n` +
                `🔗 [Trendyol'da görüntüle](${product.url})`,

              inline: false

            });

          }


          /* =====================
             WRAITH
          ===================== */

          if (
            session.package ===
            "full" &&
            equipment
          ) {

            embed.addFields({

              name:
                "🎒 WRAITH EKİPMANLARI",

              value:
                `⌨️ ${equipment.keyboard.title} • ${money(equipment.keyboard.price)}\n` +
                `🖱️ ${equipment.mouse.title} • ${money(equipment.mouse.price)}\n` +
                `🎧 ${equipment.headset.title} • ${money(equipment.headset.price)}\n` +
                `🖱️ ${equipment.mousepad.title} • ${money(equipment.mousepad.price)}`,

              inline: false

            });

          }


          /* =====================
             TOPLAM
          ===================== */

          embed.addFields({

            name:
              "💰 TOPLAM",

            value:
              `# ${money(finalTotal)}\n` +
              `✅ Bütçeyi **${money(remaining)}** aşmıyor.`,

            inline: false

          });


          await interaction.editReply({

            embeds: [embed],

            components: [

              new ActionRowBuilder()
                .addComponents(

                  new ButtonBuilder()
                    .setCustomId(
                      "new_build"
                    )
                    .setLabel(
                      "🔄 Yeni Sistem"
                    )
                    .setStyle(
                      ButtonStyle.Primary
                    )

                )

            ]

          });


        } catch (error) {

          console.error(
            "PC OLUŞTURMA HATASI:",
            error
          );


          await interaction.editReply({

            embeds: [

              new EmbedBuilder()
                .setTitle(
                  "❌ Bir şeyler patladı"
                )
                .setDescription(
                  "Fiyat servisinden veri alınırken hata oluştu.\n\n" +
                  "Railway Logs kısmındaki hatayı kontrol et."
                )

            ]

          });

        }

        return;
      }


      /* ---------- YENİ SİSTEM ---------- */

      if (
        interaction.customId ===
        "new_build"
      ) {

        const newSessionData =
          newSession(
            interaction.user.id
          );


        sessions.set(
          interaction.user.id,
          newSessionData
        );


        await interaction.update(
          mainMenu(
            newSessionData
          )
        );

        return;
      }
    }


    /* =========================
       MODAL
    ========================= */

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
          )
          .replace(/[^\d]/g, "");


      const budget =
        Number(raw);


      if (
        !Number.isFinite(budget) ||
        budget < 10000 ||
        budget > 500000
      ) {

        await interaction.reply({
          content:
            "❌ Bütçe 10.000 TL ile 500.000 TL arasında olmalı.",
          ephemeral: true
        });

        return;
      }


      session.budget =
        budget;


      await interaction.reply({
        content:
          `💰 Bütçe **${money(budget)}** olarak ayarlandı.`,
        ephemeral: true
      });

    }

  }
);


/* =====================================================
   LOGIN
===================================================== */

client.login(
  DISCORD_TOKEN
);