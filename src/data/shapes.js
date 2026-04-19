// Matematikadan 3D shakllar haqida ma'lumotlar (o'zbek tilida)

export const shapes = {
  prism: {
    name: "Prizma",
    description: "Prizma — bu asosi ko'pburchak bo'lgan, yon yuzalari parallelogrammlardan iborat fazoviy shakl.",
    parameters: [
      { key: "sides", label: "Burchaklar soni (n)", min: 3, max: 12, default: 6 },
      { key: "radius", label: "Radius (r)", min: 1, max: 10, default: 3 },
      { key: "height", label: "Balandlik (h)", min: 1, max: 10, default: 5 }
    ],
    formulas: {
      volume: {
        name: "Hajmi",
        formula: "V = S × h",
        description: "Hajm = Asos yuzasi × Balandlik"
      },
      surfaceArea: {
        name: "To'liq sirt maydoni",
        formula: "S = 2×S_asos + S_yon",
        description: "To'liq sirt = 2 × Asos yuzasi + Yon sirt maydoni"
      },
      baseArea: {
        name: "Asos yuzasi (muntazam ko'pburchak)",
        formula: "S_asos = (n × a² × ctg(π/n)) / 4",
        description: "n — burchaklar soni, a — tomon uzunligi"
      }
    },
    properties: [
      "Asoslari parallel va teng",
      "Yon qirralari parallel",
      "To'g'ri prizmada yon yuzalar to'g'ri to'rtburchak"
    ]
  },
  
  pyramid: {
    name: "Piramida",
    description: "Piramida — asosi ko'pburchak, cho'qqisi bir nuqtada birlashgan uchburchak yon yuzalarga ega shakl.",
    parameters: [
      { key: "sides", label: "Burchaklar soni (n)", min: 3, max: 12, default: 4 },
      { key: "radius", label: "Asos radiusi (r)", min: 1, max: 10, default: 3 },
      { key: "height", label: "Balandlik (h)", min: 1, max: 10, default: 5 }
    ],
    formulas: {
      volume: {
        name: "Hajmi",
        formula: "V = (1/3) × S_asos × h",
        description: "Hajm = (1/3) × Asos yuzasi × Balandlik"
      },
      surfaceArea: {
        name: "To'liq sirt maydoni",
        formula: "S = S_asos + S_yon",
        description: "To'liq sirt = Asos yuzasi + Yon sirt maydoni"
      },
      lateralArea: {
        name: "Yon sirt maydoni (muntazam piramida)",
        formula: "S_yon = (1/2) × P × l",
        description: "P — asos perimetri, l — apofema (yon yuzaning balandligi)"
      }
    },
    properties: [
      "Barcha yon yuzalar uchburchak",
      "Cho'qqidan asosga tushirilgan perpendikular — balandlik",
      "Muntazam piramidada asos muntazam ko'pburchak"
    ]
  },
  
  cylinder: {
    name: "Silindr",
    description: "Silindr — asoslari teng va parallel doiralar bo'lgan, yon sirt silindrik bo'lgan shakl.",
    parameters: [
      { key: "radius", label: "Radius (r)", min: 1, max: 10, default: 3 },
      { key: "height", label: "Balandlik (h)", min: 1, max: 10, default: 5 }
    ],
    formulas: {
      volume: {
        name: "Hajmi",
        formula: "V = π × r² × h",
        description: "Hajm = π × radius² × balandlik"
      },
      surfaceArea: {
        name: "To'liq sirt maydoni",
        formula: "S = 2πr² + 2πrh = 2πr(r + h)",
        description: "To'liq sirt = 2 × Asos yuzasi + Yon sirt"
      },
      lateralArea: {
        name: "Yon sirt maydoni",
        formula: "S_yon = 2πrh",
        description: "Yon sirt = 2π × radius × balandlik"
      }
    },
    properties: [
      "O'q — asoslar markazlarini birlashtiruvchi to'g'ri chiziq",
      "Hosil qiluvchi — yon sirtdagi to'g'ri chiziq",
      "Aylanma silindr — to'g'ri to'rtburchakni bir tomoni atrofida aylantirishdan hosil bo'ladi"
    ]
  },
  
  cone: {
    name: "Konus",
    description: "Konus — asosi doira, cho'qqisi bir nuqta bo'lgan, yon sirti konussimon shakl.",
    parameters: [
      { key: "radius", label: "Asos radiusi (r)", min: 1, max: 10, default: 3 },
      { key: "height", label: "Balandlik (h)", min: 1, max: 10, default: 5 }
    ],
    formulas: {
      volume: {
        name: "Hajmi",
        formula: "V = (1/3) × π × r² × h",
        description: "Hajm = (1/3) × π × radius² × balandlik"
      },
      surfaceArea: {
        name: "To'liq sirt maydoni",
        formula: "S = πr² + πrl = πr(r + l)",
        description: "l — hosil qiluvchi (cho'qqidan asos chekkasigacha)"
      },
      slantHeight: {
        name: "Hosil qiluvchi",
        formula: "l = √(r² + h²)",
        description: "Pifagor teoremasi asosida hisoblanadi"
      }
    },
    properties: [
      "O'q — cho'qqidan asos markaziga tushirilgan perpendikular",
      "Hosil qiluvchi — cho'qqidan asos chekkasiga tortilgan kesma",
      "Aylanma konus — to'g'ri burchakli uchburchakni bir kateti atrofida aylantirishdan hosil bo'ladi"
    ]
  },
  
  sphere: {
    name: "Shar",
    description: "Shar — markazdan bir xil masofada joylashgan barcha nuqtalar to'plamidan iborat fazoviy shakl.",
    parameters: [
      { key: "radius", label: "Radius (r)", min: 1, max: 10, default: 3 }
    ],
    formulas: {
      volume: {
        name: "Hajmi",
        formula: "V = (4/3) × π × r³",
        description: "Hajm = (4/3) × π × radius³"
      },
      surfaceArea: {
        name: "Sirt maydoni",
        formula: "S = 4πr²",
        description: "Sirt maydoni = 4π × radius²"
      },
      diameter: {
        name: "Diametr",
        formula: "d = 2r",
        description: "Diametr = 2 × radius"
      }
    },
    properties: [
      "Barcha nuqtalar markazdan bir xil masofada",
      "Katta doira — shar markazidan o'tgan kesim",
      "Sfera — sharning sirti (qobig'i)"
    ]
  }
};

// Matematikada π qiymati
export const PI = Math.PI;

// Formulalarni hisoblash uchun yordamchi funksiyalar
export const calculateVolume = (shape, params) => {
  switch (shape) {
    case 'prism': {
      const { sides = 6, radius = 3, height = 5 } = params;
      const baseArea = (sides * Math.pow(radius, 2) * Math.sin(2 * PI / sides)) / 2;
      return baseArea * height;
    }
    case 'pyramid': {
      const { sides = 4, radius = 3, height = 5 } = params;
      const baseArea = (sides * Math.pow(radius, 2) * Math.sin(2 * PI / sides)) / 2;
      return (1/3) * baseArea * height;
    }
    case 'cylinder': {
      const { radius = 3, height = 5 } = params;
      return PI * Math.pow(radius, 2) * height;
    }
    case 'cone': {
      const { radius = 3, height = 5 } = params;
      return (1/3) * PI * Math.pow(radius, 2) * height;
    }
    case 'sphere': {
      const { radius = 3 } = params;
      return (4/3) * PI * Math.pow(radius, 3);
    }
    default:
      return 0;
  }
};

export const calculateSurfaceArea = (shape, params) => {
  switch (shape) {
    case 'prism': {
      const { sides = 6, radius = 3, height = 5 } = params;
      const sideLength = 2 * radius * Math.sin(PI / sides);
      const baseArea = (sides * Math.pow(radius, 2) * Math.sin(2 * PI / sides)) / 2;
      const lateralArea = sides * sideLength * height;
      return 2 * baseArea + lateralArea;
    }
    case 'pyramid': {
      const { sides = 4, radius = 3, height = 5 } = params;
      const sideLength = 2 * radius * Math.sin(PI / sides);
      const baseArea = (sides * Math.pow(radius, 2) * Math.sin(2 * PI / sides)) / 2;
      const apothem = Math.sqrt(Math.pow(radius * Math.cos(PI / sides), 2) + Math.pow(height, 2));
      const lateralArea = (sides * sideLength * apothem) / 2;
      return baseArea + lateralArea;
    }
    case 'cylinder': {
      const { radius = 3, height = 5 } = params;
      return 2 * PI * radius * (radius + height);
    }
    case 'cone': {
      const { radius = 3, height = 5 } = params;
      const slantHeight = Math.sqrt(Math.pow(radius, 2) + Math.pow(height, 2));
      return PI * radius * (radius + slantHeight);
    }
    case 'sphere': {
      const { radius = 3 } = params;
      return 4 * PI * Math.pow(radius, 2);
    }
    default:
      return 0;
  }
};

// Test va masalalar uchun
export const sampleProblems = [
  {
    id: 1,
    shape: 'cylinder',
    question: "Radiusi 5 sm, balandligi 10 sm bo'lgan silindrning hajmini toping.",
    params: { radius: 5, height: 10 },
    answer: "V = π × 5² × 10 = 250π ≈ 785.4 sm³"
  },
  {
    id: 2,
    shape: 'sphere',
    question: "Radiusi 6 sm bo'lgan sharning sirt maydonini toping.",
    params: { radius: 6 },
    answer: "S = 4π × 6² = 144π ≈ 452.4 sm²"
  },
  {
    id: 3,
    shape: 'cone',
    question: "Asos radiusi 3 sm, balandligi 4 sm bo'lgan konusning hajmini toping.",
    params: { radius: 3, height: 4 },
    answer: "V = (1/3) × π × 3² × 4 = 12π ≈ 37.7 sm³"
  },
  {
    id: 4,
    shape: 'pyramid',
    question: "Asosi muntazam to'rtburchak, asos tomoni 6 sm, balandligi 8 sm bo'lgan piramidaning hajmini toping.",
    params: { sides: 4, radius: 4.24, height: 8 },
    answer: "V = (1/3) × 36 × 8 = 96 sm³"
  },
  {
    id: 5,
    shape: 'prism',
    question: "Asosi muntazam oltiburchak, asos tomoni 4 sm, balandligi 10 sm bo'lgan prizmaning hajmini toping.",
    params: { sides: 6, radius: 4, height: 10 },
    answer: "V = (3√3/2) × 16 × 10 ≈ 415.7 sm³"
  }
];
