const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const REEF_KEY = process.env.REEF_KEY;

if (!DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN bulunamadı!");
}

if (!REEF_KEY) {
  console.error("❌ REEF_KEY bulunamadı!");
}

/* =====================================================
   SLASH COMMAND
===================================================== */

const commands = [
  new SlashCommandBuilder()
    .setName("pc-topla")
    .setDescription("Canlı Trendyol fiyatlarıyla PC toplar.")
    .addIntegerOption(option =>
      option
        .setName("butce")
        .setDescription("Bütçen TL olarak")
        .setRequired(true)
        .setMinValue(10000)
        .setMaxValue(500000)
    )
    .addStringOption(option =>
      option
        .setName("kullanim")
        .setDescription("PC kullanım amacı")
        .setRequired(true)
        .addChoices(
          { name: "Oyun", value: "oyun" },
          { name: "Yayın", value: "yayin" },
          { name: "İş", value: "is" }
        )
    )
    .addStringOption(option =>
      option
        .setName("cpu")
        .setDescription("İşlemci tercihi")
        .setRequired(true)
        .addChoices(
          { name: "AMD", value: "amd" },
          { name: "Intel", value: "intel" }
        )
    )
    .addStringOption(option =>
      option
        .setName("gpu")
        .setDescription("Ekran kartı tercihi")
        .setRequired(true)
        .addChoices(
          { name: "NVIDIA", value: "nvidia" },
          { name: "AMD", value: "amd" }
        )
    )
].map(command => command.toJSON());


/* =====================================================
   REEFAPI TRENDYOL SEARCH
===================================================== */

async function trendyolSearch(query) {
  const response = await fetch(
    "https://api.reefapi.com/trendyol/v1/search",
    {
      method: "POST",

      headers: {
        "x-api-key": REEF_KEY,
        "content-type": "application/json"
      },

      body: JSON.stringify({
        query: query,
        page: 1,
        max_pages: 1
      })
    }
  );

  const json = await response.json();

  if (!response.ok || json.ok === false) {
    console.error("REEF API:", json);

    throw new Error(
      json?.error?.message ||
      "ReefAPI isteği başarısız."
    );
  }

  return json?.data?.results || [];
}


/* =====================================================
   PRICE OKUMA
===================================================== */

function getPrice(product) {
  const price = product?.price;

  if (typeof price === "number") {
    return price;
  }

  if (typeof price === "string") {
    const cleaned = price
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const number = Number(cleaned);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  /*
    Bazı API cevaplarında fiyat obje olarak gelebilir.
  */

  if (price && typeof price === "object") {

    const possibleValues = [
      price.current,
      price.value,
      price.amount,
      price.discounted,
      price.selling
    ];

    for (const value of possibleValues) {

      if (typeof value === "number") {
        return value;
      }

      if (typeof value === "string") {

        const number = Number(
          value
            .replace(/[^\d,.-]/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
        );

        if (Number.isFinite(number)) {
          return number;
        }
      }
    }
  }

  return null;
}


/* =====================================================
   PARA
===================================================== */

function money(number) {
  return `${Math.round(number).toLocaleString("tr-TR")} TL`;
}


/* =====================================================
   ÜRÜN SEÇME
===================================================== */

function chooseProduct(results, keywords) {

  const products = results
    .map(product => {

      return {
        ...product,
        livePrice: getPrice(product)
      };

    })
    .filter(product => {

      return (
        product.title &&
        product.url &&
        product.livePrice !== null &&
        product.livePrice > 0
      );

    });


  if (!products.length) {
    return null;
  }


  const scored = products.map(product => {

    const title =
      product.title.toLowerCase();

    let score = 0;


    /*
      Aradığımız model başlıkta varsa
      yüksek puan.
    */

    for (const keyword of keywords) {

      if (
        title.includes(
          keyword.toLowerCase()
        )
      ) {
        score += 100;
      }
    }


    /*
      Yanlış ürünleri ele.
    */

    const badWords = [
      "laptop",
      "notebook",
      "oyuncu bilgisayar",
      "masaüstü bilgisayar",
      "hazır sistem",
      "pc toplama"
    ];


    for (const word of badWords) {

      if (title.includes(word)) {
        score -= 1000;
      }
    }


    return {
      product,
      score
    };

  });


  scored.sort((a, b) => {

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return (
      a.product.livePrice -
      b.product.livePrice
    );

  });


  return scored[0].product;
}


/* =====================================================
   ARAMA TANIMLARI
===================================================== */

function getSearches(
  budget,
  cpu,
  gpu
) {

  let cpuSearch;
  let gpuSearch;


  /* ================= CPU ================= */

  if (cpu === "amd") {

    if (budget < 40000) {

      cpuSearch = {
        query: "Ryzen 5 5500 işlemci",
        keywords: [
          "ryzen 5 5500"
        ]
      };

    } else if (budget < 70000) {

      cpuSearch = {
        query: "Ryzen 5 7500F işlemci",
        keywords: [
          "ryzen 5 7500f"
        ]
      };

    } else {

      cpuSearch = {
        query: "Ryzen 7 7800X3D işlemci",
        keywords: [
          "ryzen 7 7800x3d"
        ]
      };
    }

  } else {

    if (budget < 40000) {

      cpuSearch = {
        query: "Intel Core i5 12400F işlemci",
        keywords: [
          "i5-12400f",
          "i5 12400f"
        ]
      };

    } else if (budget < 70000) {

      cpuSearch = {
        query: "Intel Core i5 14400F işlemci",
        keywords: [
          "i5-14400f",
          "i5 14400f"
        ]
      };

    } else {

      cpuSearch = {
        query: "Intel Core i7 14700F işlemci",
        keywords: [
          "i7-14700f",
          "i7 14700f"
        ]
      };
    }
  }


  /* ================= GPU ================= */

  if (gpu === "nvidia") {

    if (budget < 40000) {

      gpuSearch = {
        query: "RTX 4060 ekran kartı",
        keywords: [
          "rtx 4060"
        ]
      };

    } else if (budget < 70000) {

      gpuSearch = {
        query: "RTX 5060 ekran kartı",
        keywords: [
          "rtx 5060"
        ]
      };

    } else if (budget < 100000) {

      gpuSearch = {
        query: "RTX 5070 ekran kartı",
        keywords: [
          "rtx 5070"
        ]
      };

    } else {

      gpuSearch = {
        query: "RTX 5080 ekran kartı",
        keywords: [
          "rtx 5080"
        ]
      };
    }

  } else {

    if (budget < 40000) {

      gpuSearch = {
        query: "RX 7600 ekran kartı",
        keywords: [
          "rx 7600"
        ]
      };

    } else if (budget < 70000) {

      gpuSearch = {
        query: "RX 7700 XT ekran kartı",
        keywords: [
          "rx 7700 xt"
        ]
      };

    } else if (budget < 100000) {

      gpuSearch = {
        query: "RX 7900 GRE ekran kartı",
        keywords: [
          "rx 7900 gre"
        ]
      };

    } else {

      gpuSearch = {
        query: "RX 9070 XT ekran kartı",
        keywords: [
          "rx 9070 xt"
        ]
      };
    }
  }


  /* ================= RAM ================= */

  const ramSearch =
    budget < 50000
      ? {
          query: "16GB DDR5 6000MHz RAM",
          keywords: [
            "16gb",
            "ddr5",
            "6000"
          ]
        }
      : {
          query: "32GB DDR5 6000MHz RAM",
          keywords: [
            "32gb",
            "ddr5",
            "6000"
          ]
        };


  /* ================= SSD ================= */

  const ssdSearch =
    budget < 60000
      ? {
          query: "1TB NVMe SSD",
          keywords: [
            "1tb",
            "nvme"
          ]
        }
      : {
          query: "2TB NVMe SSD",
          keywords: [
            "2tb",
            "nvme"
          ]
        };


  /* ================= ANAKART ================= */

  const motherboardSearch =
    cpu === "amd"
      ? budget < 40000
        ? {
            query: "B550 anakart",
            keywords: [
              "b550"
            ]
          }
        : {
            query: "B650 anakart",
            keywords: [
              "b650"
            ]
          }
      : {
          query: "B760 anakart",
          keywords: [
            "b760"
          ]
        };


  /* ================= PSU ================= */

  const psuSearch =
    budget < 60000
      ? {
          query: "650W 80 Plus Bronze PSU",
          keywords: [
            "650w",
            "80 plus"
          ]
        }
      : {
          query: "750W 80 Plus Gold PSU",
          keywords: [
            "750w",
            "80 plus",
            "gold"
          ]
        };


  /* ================= KASA ================= */

  const caseSearch = {
    query: "Mesh ATX Gaming Kasa",
    keywords: [
      "mesh",
      "atx"
    ]
  };


  return {
    cpuSearch,
    gpuSearch,
    ramSearch,
    ssdSearch,
    motherboardSearch,
    psuSearch,
    caseSearch
  };
}


/* =====================================================
   BİR ÜRÜN BUL
===================================================== */

async function findProduct(search) {

  const results =
    await trendyolSearch(
      search.query
    );

  return chooseProduct(
    results,
    search.keywords
  );
}


/* =====================================================
   DISCORD READY
===================================================== */

client.once("ready", async () => {

  console.log(
    `🟢 Bot aktif: ${client.user.tag}`
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
      "🟢 Slash komutları kaydedildi!"
    );

  } catch (error) {

    console.error(
      "❌ Slash komut hatası:",
      error
    );

  }
});


/* =====================================================
   KOMUT
===================================================== */

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }


    if (
      interaction.commandName !==
      "pc-topla"
    ) {
      return;
    }


    const budget =
      interaction.options.getInteger(
        "butce"
      );

    const usage =
      interaction.options.getString(
        "kullanim"
      );

    const cpu =
      interaction.options.getString(
        "cpu"
      );

    const gpu =
      interaction.options.getString(
        "gpu"
      );


    await interaction.deferReply();


    try {

      console.log(
        `🔎 PC aranıyor: ${budget} TL`
      );


      const searches =
        getSearches(
          budget,
          cpu,
          gpu
        );


      /*
        7 aramayı aynı anda yapıyoruz.
        Böylece bot gereksiz yere beklemiyor.
      */

      const [
        cpuProduct,
        gpuProduct,
        ramProduct,
        ssdProduct,
        motherboardProduct,
        psuProduct,
        caseProduct
      ] = await Promise.all([

        findProduct(
          searches.cpuSearch
        ),

        findProduct(
          searches.gpuSearch
        ),

        findProduct(
          searches.ramSearch
        ),

        findProduct(
          searches.ssdSearch
        ),

        findProduct(
          searches.motherboardSearch
        ),

        findProduct(
          searches.psuSearch
        ),

        findProduct(
          searches.caseSearch
        )

      ]);


      const parts = [

        {
          name: "🧠 İşlemci",
          product: cpuProduct
        },

        {
          name: "🎮 Ekran Kartı",
          product: gpuProduct
        },

        {
          name: "🧩 RAM",
          product: ramProduct
        },

        {
          name: "💾 SSD",
          product: ssdProduct
        },

        {
          name: "🔧 Anakart",
          product: motherboardProduct
        },

        {
          name: "⚡ PSU",
          product: psuProduct
        },

        {
          name: "📦 Kasa",
          product: caseProduct
        }

      ];


      const missing =
        parts.filter(
          part => !part.product
        );


      if (missing.length > 0) {

        await interaction.editReply(
          "❌ Bazı parçaların canlı fiyatını bulamadım:\n\n" +
          missing
            .map(
              part => part.name
            )
            .join("\n")
        );

        return;
      }


      /* =================================================
         TOPLAM
      ================================================= */

      const total =
        parts.reduce(
          (sum, part) =>
            sum +
            part.product.livePrice,
          0
        );


      /* =================================================
         EMBED
      ================================================= */

      const embed =
        new EmbedBuilder()
          .setTitle(
            "🖥️ PC Builder Bot"
          )

          .setDescription(
            `💰 **Bütçe:** ${money(budget)}\n` +
            `🎯 **Kullanım:** ${usage}\n` +
            `🧠 **CPU:** ${cpu.toUpperCase()}\n` +
            `🎮 **GPU:** ${gpu.toUpperCase()}\n\n` +
            `🟢 **Canlı Trendyol fiyatları**`
          );


      for (
        const part of parts
      ) {

        const product =
          part.product;


        embed.addFields({

          name: part.name,

          value:
            `**${product.title}**\n` +
            `💵 **${money(product.livePrice)}**\n` +
            `🔗 [Trendyol'da görüntüle](${product.url})`,

          inline: false

        });

      }


      let budgetMessage;


      if (total <= budget) {

        budgetMessage =
          `✅ Bütçenin **${money(
            budget - total
          )}** altında`;

      } else {

        budgetMessage =
          `⚠️ Bütçeyi **${money(
            total - budget
          )}** aşıyor`;

      }


      embed.addFields({

        name: "💰 TOPLAM",

        value:
          `# ${money(total)}\n` +
          budgetMessage,

        inline: false

      });


      embed.setFooter({

        text:
          "Canlı Trendyol fiyatları • ReefAPI • PC Builder Bot"

      });


      await interaction.editReply({
        embeds: [embed]
      });


      console.log(
        `✅ PC hazır: ${money(total)}`
      );

    } catch (error) {

      console.error(
        "❌ PC TOPLA HATASI:",
        error
      );


      await interaction.editReply(
        "❌ ReefAPI'den canlı fiyat alınırken hata oluştu.\n" +
        "Railway → Deployments → Logs kısmına bak."
      );

    }

  }
);


/* =====================================================
   LOGIN
===================================================== */

client.login(
  DISCORD_TOKEN
);