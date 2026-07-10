var DATA = {
  classes: [
    { id: "c1", name: "Lớp 3A", level: "tieuhoc" },
    { id: "c2", name: "Mầm non - Lá", level: "mamnon" }
  ],
  subjectsByClass: {
    c1: [
      {
        id: "s1",
        name: "Tiếng Anh",
        color: "#2D6A4F",
        units: [
          {
            id: "u1",
            name: "Trái cây – Fruits",
            progress: "0/10",
            activities: [
              { id: "a1", name: "Thẻ đọc", type: "flashcard", locked: false },
              { id: "a2a", name: "Nghe từ, chọn hình", type: "quiz", format: "word-to-image", locked: false, maxQuestions: 30 },
              { id: "a2b", name: "Nhìn hình, chọn từ", type: "quiz", format: "image-to-word", locked: false, maxQuestions: 30 },
              { id: "a2d", name: "Chỉ nhìn hình, đoán từ", type: "quiz", format: "image-only-to-word", locked: false, maxQuestions: 30 },
              { id: "a3", name: "Đánh máy có gợi ý", type: "typing", mode: "hint", locked: false, maxQuestions: 30 },
              { id: "a4", name: "Đánh máy không gợi ý", type: "typing", mode: "blank", locked: false, maxQuestions: 30 },
              { id: "a5", name: "Nghe chọn chữ/ảnh đúng", type: "listen-choose", locked: true },
              { id: "a6", name: "Sắp xếp câu song ngữ", type: "sentence-order", locked: true },
              { id: "a12", name: "Khuyết chữ cái", type: "missing-letter", locked: false, maxQuestions: 30 }
            ]
          }
        ]
      },
      {
        id: "s2",
        name: "Toán",
        color: "#F77F00",
        units: [
          {
            id: "u2",
            name: "Phép cộng trong phạm vi 10",
            progress: "0/10",
            activities: [
              { id: "a7", name: "Phép cộng cơ bản", locked: true }
            ]
          }
        ]
      },
      {
        id: "s3",
        name: "Tiếng Việt",
        color: "#E63946",
        units: [
          {
            id: "u3",
            name: "Âm vần ao - au",
            progress: "0/12",
            activities: [
              { id: "a8", name: "Đọc theo", locked: true }
            ]
          }
        ]
      }
    ],
    c2: [
      {
        id: "s4",
        name: "Tiếng Anh",
        color: "#2D6A4F",
        units: [
          {
            id: "u4",
            name: "Con vật – Animals",
            progress: "0/8",
            activities: [
              { id: "a9", name: "Đọc theo", locked: false },
              { id: "a10", name: "Nghe chọn đúng chữ", locked: true }
            ]
          }
        ]
      },
      {
        id: "s5",
        name: "Tiếng Việt",
        color: "#E63946",
        units: [
          {
            id: "u5",
            name: "Chữ cái a, b, c",
            progress: "0/6",
            activities: [
              { id: "a11", name: "Đọc theo", locked: false }
            ]
          }
        ]
      }
    ]
  }
};
