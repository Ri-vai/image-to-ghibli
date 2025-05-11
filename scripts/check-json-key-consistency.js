const fs = require("fs");
const path = require("path");

// 配置信息
const CONFIG = {
  // i18n 目录配置
  i18n: {
    baseDir: path.join(__dirname, "../i18n"),
    defaultLang: "en.json",
  },
};

// 命令行参数解析
const args = process.argv.slice(2);
const params = {
  dir: "messages", // 默认检查 messages 目录
};

// 解析命令行参数
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith("-")) {
    switch (arg) {
      case "--dir":
      case "-d":
        params.dir = args[++i];
        break;
      case "--help":
      case "-h":
        console.log(`
JSON键一致性检查工具:
  node check-json-key-consistency.js [选项]

选项:
  --dir, -d     指定要检查的目录 (默认: messages)
                可选值: messages, pages, pages/landing 等
  --help, -h    显示帮助信息

示例:
  node check-json-key-consistency.js                    # 检查 messages 目录
  node check-json-key-consistency.js -d pages          # 检查 pages 目录
  node check-json-key-consistency.js -d pages/landing  # 检查特定页面目录
        `);
        process.exit(0);
    }
  } else {
    params.dir = arg;
  }
}

/**
 * 获取对象的所有键路径
 */
function getKeyPaths(obj, prefix = "") {
  const paths = new Set();

  function traverse(o, p = "") {
    for (const [key, value] of Object.entries(o)) {
      const currentPath = p ? `${p}.${key}` : key;
      paths.add(currentPath);

      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === "object" && item !== null) {
              traverse(item, `${currentPath}.${index}`);
            } else {
              paths.add(`${currentPath}.${index}`);
            }
          });
        } else {
          traverse(value, currentPath);
        }
      }
    }
  }

  traverse(obj);
  return Array.from(paths);
}

/**
 * 检查两个对象的键是否一致
 */
function checkKeyConsistency(source, target) {
  const sourceKeys = new Set(getKeyPaths(source));
  const targetKeys = new Set(getKeyPaths(target));

  const missingKeys = Array.from(sourceKeys).filter(
    (key) => !targetKeys.has(key)
  );
  const extraKeys = Array.from(targetKeys).filter(
    (key) => !sourceKeys.has(key)
  );

  return {
    missingKeys,
    extraKeys,
    isConsistent: missingKeys.length === 0 && extraKeys.length === 0,
  };
}

/**
 * 检查目录中的所有JSON文件
 */
async function checkDirectory(dirPath) {
  const { default: chalk } = await import("chalk");

  console.log(chalk.blue(`\n📂 检查目录: ${dirPath}`));

  // 读取源语言文件
  const sourcePath = path.join(dirPath, CONFIG.i18n.defaultLang);
  if (!fs.existsSync(sourcePath)) {
    console.log(chalk.red(`❌ 源语言文件不存在: ${sourcePath}`));
    return;
  }

  const sourceData = JSON.parse(fs.readFileSync(sourcePath, "utf-8"));
  console.log(chalk.gray(`✓ 已读取源语言文件: ${CONFIG.i18n.defaultLang}`));

  // 获取目录中的所有JSON文件
  const files = fs
    .readdirSync(dirPath)
    .filter(
      (file) => file.endsWith(".json") && file !== CONFIG.i18n.defaultLang
    );

  let hasIssues = false;

  // 检查每个目标语言文件
  for (const file of files) {
    const targetPath = path.join(dirPath, file);
    const targetData = JSON.parse(fs.readFileSync(targetPath, "utf-8"));

    console.log(chalk.gray(`\n正在检查: ${file}`));
    const result = checkKeyConsistency(sourceData, targetData);

    if (!result.isConsistent) {
      hasIssues = true;

      if (result.missingKeys.length > 0) {
        console.log(chalk.red("\n缺失的键:"));
        result.missingKeys.forEach((key) => {
          console.log(chalk.red(`  - ${key}`));
        });
      }

      if (result.extraKeys.length > 0) {
        console.log(chalk.yellow("\n多余的键:"));
        result.extraKeys.forEach((key) => {
          console.log(chalk.yellow(`  - ${key}`));
        });
      }
    } else {
      console.log(chalk.green("✓ 键完全一致"));
    }
  }

  if (hasIssues) {
    console.log(chalk.red("\n❌ 检查完成，发现问题"));
  } else {
    console.log(chalk.green("\n✨ 检查完成，所有文件都符合要求"));
  }
}

/**
 * 主函数
 */
async function main() {
  const { default: chalk } = await import("chalk");

  try {
    const targetDir = path.join(CONFIG.i18n.baseDir, params.dir);

    // 检查目录是否存在
    if (!fs.existsSync(targetDir)) {
      throw new Error(`目录不存在: ${targetDir}`);
    }

    // 如果是直接处理目录
    if (!fs.statSync(targetDir).isDirectory()) {
      throw new Error(`${targetDir} 不是一个目录`);
    }

    // 获取所有需要处理的目录
    const directories = [targetDir];
    if (params.dir === "pages") {
      // 如果是 pages 目录，还需要处理子目录
      const subDirs = fs
        .readdirSync(targetDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => path.join(targetDir, dirent.name));
      directories.push(...subDirs);
    }

    // 处理每个目录
    for (const dir of directories) {
      await checkDirectory(dir);
    }
  } catch (error) {
    console.error(chalk.red(`错误: ${error.message}`));
    process.exit(1);
  }
}

// 执行检查
if (require.main === module) {
  main();
}

// 导出函数供测试使用
module.exports = {
  getKeyPaths,
  checkKeyConsistency,
};
