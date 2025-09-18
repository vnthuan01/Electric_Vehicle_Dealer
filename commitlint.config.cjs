module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
    ],
    "subject-case": [0],
    "subject-empty": [2, "never"],
    "subject-max-length": [2, "always", 72],
  },
};
//1️⃣ feat – thêm tính năng mới
// feat(auth): add login endpoint
// feat(vehicle): implement electric car search filter

// 2️⃣ fix – sửa lỗi
// fix(user): correct password hashing bug
// fix(api): handle missing parameters gracefully

// 3️⃣ docs – tài liệu
// docs(readme): update installation instructions
// docs(api): add endpoint usage examples

// 4️⃣ style – code style / format
// style(ui): format button component
// style(server): fix indentation and semi-colons

// 5️⃣ refactor – refactor code (không thêm tính năng, không sửa lỗi)
// refactor(auth): extract validation logic into middleware
// refactor(db): simplify mongoose schema definitions

// 6️⃣ test – thêm hoặc sửa test
// test(auth): add unit tests for login endpoint
// test(vehicle): fix failing search filter test

// 7️⃣ chore – công việc bảo trì, update dependencies
// chore(deps): update express and mongoose to latest versions
// chore(build): configure husky pre-commit hooks
