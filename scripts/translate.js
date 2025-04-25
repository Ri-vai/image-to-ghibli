const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.join(__dirname, "../.env.development") });
const { getLanguageInfo } = require("./languages");
const { checkKeyConsistency } = require("./check-json-key-consistency");

// 命令行参数解析
const args = process.argv.slice(2);
const params = {
  dir: "messages", // 默认翻译 messages 目录
  useRules: false, // 默认不使用翻译规则
};

// 解析命令行参数
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  // 处理选项
  if (arg.startsWith("-")) {
    switch (arg) {
      case "--dir":
      case "-d":
        params.dir = args[++i];
        break;
      case "--rules":
      case "-r":
        params.useRules = true;
        break;
      case "--help":
      case "-h":
        console.log(`
翻译工具使用说明:
  node translate.js [选项] [目录]

选项:
  --dir, -d     指定要翻译的目录 (默认: messages)
                可选值: messages, pages, pages/landing 等
  --rules, -r   使用翻译规则 (用于页面翻译，排除特定字段)
  --help, -h    显示帮助信息

也可以直接指定目录作为第一个参数:
  node translate.js pages/landing -r  # 等同于 -d pages/landing -r

示例:
  node translate.js                     # 翻译 messages 目录
  node translate.js -d pages -r         # 翻译 pages 目录并使用规则
  node translate.js pages/landing -r    # 翻译特定页面目录
        `);
        process.exit(0);
    }
  } else {
    // 如果不是选项，则视为目录参数
    params.dir = arg;
  }
}

// 配置信息
const CONFIG = {
  // API 相关配置
  api: {
    endpoint: process.env.TRANSLATE_API_ENDPOINT,
    key: process.env.TRANSLATE_API_KEY,
    model: process.env.TRANSLATE_MODEL,
  },
  // 文件路径相关配置
  paths: {
    baseDir: path.join(__dirname, "../i18n", params.dir),
    sourceFile: "en.json",
  },
  // 目标语言列表（从环境变量中获取）
  targetLanguages: process.env.TRANSLATE_TARGET_LANGS,
  // 翻译规则（仅在使用规则时生效）
  rules: {
    // 不需要翻译的字段
    excludeKeys: [
      "url", // URL 链接
      "src", // 图片路径
      "href", // 链接地址
      "id", // ID
      "key", // 键名
      "code", // 代码
      "email", // 邮箱
      "phone", // 电话
      "link", // 链接
      "path", // 路径
      "icon", // 图标
      "target", // 目标
      "variant", // 变体
      "interval", // 间隔
      "currency", // 货币
      "unit", // 单位
      "amount", // 金额
      "is_featured", // 是否推荐
      "autoplay", // 自动播放
      "loop", // 循环
      "muted", // 静音
      "show_sign", // 显示签名
      "show_theme", // 显示主题
      "show_locale", // 显示语言
      "show_happy_users", // 显示快乐用户
      "show_badge", // 显示徽章

      // 添加新的字段
      "product_title", // 产品标题
      "product_id", // 产品ID
      "monthly", // 月度
      "annual", // 年度
      "product_name", // 产品名称
      "credits", // 积分
      "valid_months", // 有效月份
    ],
    // 需要翻译的字段（优先级高于 excludeKeys）
    includeKeys: [
      "title", // 标题
      "desc", // 描述
      "description", // 描述
      "content", // 内容
      "text", // 文本
      "label", // 标签
      "name", // 名称
      "message", // 消息
      "placeholder", // 占位符
      "alt", // 图片替代文本
      "tip", // 提示
    ],
  },
};

// 翻译系统提示词模板
const SYSTEM_PROMPT = `
You are a professional translator. Please translate the following JSON content from {{originLng}} to {{targetLng}}.

Translation Rules:
1. Only translate the values, keep all keys unchanged
2. Maintain the exact JSON structure and array/object types
3. Preserve all variables and placeholders (e.g. {left_credits})
4. Keep brand names, technical terms, and proper nouns in their original form
5. Return only the translated JSON without any additional text or formatting
6. Ensure the output is valid JSON format
7. IMPORTANT: Always use English quotes (") instead of Chinese quotes ("") in the translation
8. IMPORTANT: Ensure all special characters are properly escaped in JSON
9. IMPORTANT: Keep the exact same structure - if source is array, output must be array
10. IMPORTANT: Never split or break long translations into multiple lines
11. IMPORTANT: Never duplicate keys in the output
12. IMPORTANT: All translations must be on a single line, no line breaks in values
13. IMPORTANT: Return the exact same key structure as input

Example Input:
{
  "key1.nested": "Text to translate",
  "key2.deep.path": "Another text"
}

Example Output:
{
  "key1.nested": "翻译后的文本",
  "key2.deep.path": "另一段文本"
}
`;

/**
 * Check if a key should be translated based on rules
 * @param {string} key - The key to check
 * @returns {boolean} - Whether the key should be translated
 */
function shouldTranslateKey(key) {
  if (!params.useRules) {
    return true;
  }

  // 如果在必须翻译列表中，直接返回 true
  if (
    CONFIG.rules.includeKeys.some((pattern) =>
      key.toLowerCase().includes(pattern)
    )
  ) {
    return true;
  }

  // 如果在排除列表中，返回 false
  if (
    CONFIG.rules.excludeKeys.some((pattern) =>
      key.toLowerCase().includes(pattern)
    )
  ) {
    return false;
  }

  // 默认翻译
  return true;
}

/**
 * Deep clone object with same structure
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
function cloneStructure(obj) {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => cloneStructure(item));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = cloneStructure(value);
  }
  return result;
}

/**
 * Prepare object for translation by flattening and filtering
 * @param {Object} obj - Object to prepare
 * @param {string} parentKey - Parent key for nested objects
 * @returns {Object} - Prepared object
 */
function prepareForTranslation(obj, parentKey = "") {
  const result = {
    toTranslate: {},
    structure: cloneStructure(obj), // 保存完整的结构
  };

  function processValue(value, key, fullKey) {
    if (typeof value === "string" && shouldTranslateKey(key)) {
      result.toTranslate[fullKey] = value;
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "string" && shouldTranslateKey(key)) {
          result.toTranslate[`${fullKey}.${index}`] = item;
        } else if (typeof item === "object" && item !== null) {
          traverse(item, `${fullKey}.${index}`);
        }
      });
    }
  }

  function traverse(object, prefix = "") {
    for (const [key, value] of Object.entries(object)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          processValue(value, key, fullKey);
        } else {
          traverse(value, fullKey);
        }
      } else {
        processValue(value, key, fullKey);
      }
    }
  }

  traverse(obj);
  return result;
}

/**
 * 格式化日志输出
 */
async function formatLog(type, message, data = null) {
  const { default: chalk } = await import("chalk");
  const timestamp = new Date().toLocaleTimeString();
  let output = "";

  switch (type) {
    case "info":
      output = chalk.blue(`[${timestamp}] ℹ️  ${message}`);
      break;
    case "success":
      output = chalk.green(`[${timestamp}] ✓ ${message}`);
      break;
    case "warning":
      output = chalk.yellow(`[${timestamp}] ⚠️  ${message}`);
      break;
    case "error":
      output = chalk.red(`[${timestamp}] ❌ ${message}`);
      break;
    case "debug":
      if (process.env.DEBUG) {
        output = chalk.gray(`[${timestamp}] 🔍 ${message}`);
        if (data) {
          const dataStr =
            typeof data === "string" ? data : JSON.stringify(data, null, 2);
          output += "\n" + chalk.gray("  " + dataStr.split("\n").join("\n  "));
        }
      }
      break;
  }

  if (output) {
    console.log(output);
  }
}

/**
 * 显示翻译进度
 */
async function showProgress(current, total) {
  const { default: chalk } = await import("chalk");
  const percentage = Math.round((current / total) * 100);
  const width = 30;
  const completed = Math.floor((width * current) / total);
  const bar = "█".repeat(completed) + "░".repeat(width - completed);
  process.stdout.write(
    `\r${chalk.cyan(`[${bar}] ${percentage}% (${current}/${total})`)}`
  );
  if (current === total) {
    process.stdout.write("\n");
  }
}

/**
 * 从对象中获取嵌套值
 */
function getNestedValue(obj, keyPath) {
  const keys = keyPath.split(".");
  let current = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }

  return current;
}

/**
 * 设置对象的嵌套值
 */
function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split(".");
  let current = obj;

  // 创建或遍历嵌套结构
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  // 设置最终值
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}

/**
 * 检查并获取需要翻译的内容
 */
function getContentToTranslate(sourceData, targetData) {
  // 先克隆源数据的结构
  const baseStructure = cloneStructure(sourceData);

  function processValue(source, target, path = "") {
    const result = {};

    // 处理数组
    if (Array.isArray(source)) {
      // 如果是数组，我们保持数组结构，但只翻译其中的文本内容
      source.forEach((item, index) => {
        const itemPath = path ? `${path}.${index}` : `${index}`;
        const targetItem = target?.[index];

        if (typeof item === "string") {
          if (!targetItem) {
            result[itemPath] = item;
          }
        } else if (item && typeof item === "object") {
          const nestedResult = processValue(item, targetItem, itemPath);
          Object.assign(result, nestedResult);
        }
      });
      return result;
    }

    // 处理对象
    if (source && typeof source === "object") {
      for (const [key, value] of Object.entries(source)) {
        const fullPath = path ? `${path}.${key}` : key;
        const targetValue = target?.[key];

        // 检查是否是配置字段
        const isConfigField =
          key.startsWith("show_") ||
          [
            "autoplay",
            "loop",
            "muted",
            "is_featured",
            "amount",
            "interval",
            "unit",
          ].includes(key);

        if (isConfigField) {
          // 对于配置字段，直接复制值而不翻译
          if (!targetValue) {
            result[fullPath] = value;
          }
          continue;
        }

        if (typeof value === "string") {
          if (!targetValue && shouldTranslateKey(key)) {
            result[fullPath] = value;
          }
        } else if (value && typeof value === "object") {
          const nestedResult = processValue(value, targetValue, fullPath);
          Object.assign(result, nestedResult);
        }
      }
    }

    return result;
  }

  const contentToTranslate = processValue(sourceData, targetData);
  return Object.keys(contentToTranslate).length > 0 ? contentToTranslate : null;
}

/**
 * 合并翻译结果到目标对象
 */
function mergeTranslations(sourceData, targetData, translatedData) {
  const result = cloneStructure(sourceData);

  // 首先复制所有源数据的结构
  function copyStructure(source, target) {
    if (Array.isArray(source)) {
      return source.map((item, index) => {
        if (typeof item === "string") {
          return target?.[index] || item;
        }
        return copyStructure(item, target?.[index]);
      });
    }

    if (source && typeof source === "object") {
      const result = {};
      for (const [key, value] of Object.entries(source)) {
        if (typeof value === "string") {
          result[key] = target?.[key] || value;
        } else if (value && typeof value === "object") {
          result[key] = copyStructure(value, target?.[key]);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return source;
  }

  // 复制基础结构
  const baseStructure = copyStructure(sourceData, targetData);

  // 应用翻译
  for (const [keyPath, value] of Object.entries(translatedData)) {
    setNestedValue(baseStructure, keyPath, value);
  }

  return baseStructure;
}

/**
 * 根据源对象的键顺序重新排序目标对象
 * @param {Object} sourceObj - 源对象（用于参考键顺序）
 * @param {Object} targetObj - 需要重新排序的目标对象
 * @returns {Object} - 重新排序后的对象
 */
function reorderKeys(sourceObj, targetObj) {
  // 如果不是对象或是数组，直接返回目标值
  if (
    typeof sourceObj !== "object" ||
    sourceObj === null ||
    Array.isArray(sourceObj)
  ) {
    return targetObj;
  }

  // 创建新的有序对象
  const orderedObj = {};

  // 遍历源对象的键，保持顺序
  for (const key of Object.keys(sourceObj)) {
    if (key in targetObj) {
      // 如果源对象的值是对象，递归处理
      if (
        typeof sourceObj[key] === "object" &&
        sourceObj[key] !== null &&
        !Array.isArray(sourceObj[key])
      ) {
        orderedObj[key] = reorderKeys(sourceObj[key], targetObj[key]);
      } else {
        // 否则直接使用目标对象的值
        orderedObj[key] = targetObj[key];
      }
    }
  }

  // 添加目标对象中存在但源对象中不存在的键（按字母顺序）
  const remainingKeys = Object.keys(targetObj).filter(
    (key) => !(key in orderedObj)
  );
  remainingKeys.sort().forEach((key) => {
    orderedObj[key] = targetObj[key];
  });

  return orderedObj;
}

/**
 * Process a single directory
 */
async function processDirectory(dirPath) {
  const subDir = path.relative(CONFIG.paths.baseDir, dirPath);
  await formatLog("info", `\n📂 开始处理目录: ${subDir || "根目录"}`);

  // 检查源文件是否存在
  const sourceFilePath = path.join(dirPath, CONFIG.paths.sourceFile);
  if (!fs.existsSync(sourceFilePath)) {
    await formatLog("warning", `源语言文件不存在: ${CONFIG.paths.sourceFile}`);
    return;
  }

  // 读取源文件
  await formatLog("info", `读取源文件: ${path.basename(sourceFilePath)}`);
  const sourceData = JSON.parse(fs.readFileSync(sourceFilePath, "utf-8"));

  // 获取源语言信息
  const sourceLangCode = path.basename(CONFIG.paths.sourceFile, ".json");
  const sourceLangInfo = getLanguageInfo(sourceLangCode);
  const sourceLang = `${sourceLangInfo.language}(${sourceLangInfo.code})`;

  // 处理每个目标语言
  const targetLangs = CONFIG.targetLanguages.split(",");
  await formatLog("info", `\n🌐 准备翻译到 ${targetLangs.length} 种语言`);

  for (let i = 0; i < targetLangs.length; i++) {
    const targetCode = targetLangs[i].trim();
    const targetLangInfo = getLanguageInfo(targetCode);
    const targetLang = `${targetLangInfo.language}(${targetLangInfo.code})`;

    await formatLog(
      "info",
      `\n[${i + 1}/${targetLangs.length}] 处理语言: ${targetLang}`
    );

    // 读取目标语言文件
    const targetPath = path.join(dirPath, `${targetCode}.json`);
    let targetData = {};

    if (fs.existsSync(targetPath)) {
      await formatLog("info", `找到现有翻译文件: ${path.basename(targetPath)}`);
      targetData = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
    } else {
      await formatLog(
        "info",
        `将创建新的翻译文件: ${path.basename(targetPath)}`
      );
    }

    try {
      // 检查键一致性
      const contentToTranslate = getContentToTranslate(sourceData, targetData);

      if (!contentToTranslate) {
        await formatLog("success", `✨ ${targetLang} 所有键都已存在，无需翻译`);
        continue;
      }

      const keysCount = Object.keys(contentToTranslate).length;
      await formatLog("info", `发现 ${keysCount} 个需要翻译的键`);

      // 翻译新内容
      await formatLog("info", `🔄 开始翻译缺失的内容...`);
      const translatedData = await translateJson(
        contentToTranslate,
        sourceLang,
        targetLang
      );

      // 合并翻译结果
      await formatLog("info", `🔀 合并翻译结果...`);
      const mergedData = mergeTranslations(
        sourceData,
        targetData,
        translatedData
      );

      // 重新排序
      await formatLog("info", `📝 重新排序翻译文件以匹配源文件结构...`);
      const orderedData = reorderKeys(sourceData, mergedData);

      // 保存文件
      fs.writeFileSync(
        targetPath,
        JSON.stringify(orderedData, null, 2),
        "utf-8"
      );
      await formatLog(
        "success",
        `💾 已保存翻译文件: ${path.basename(targetPath)}`
      );
    } catch (error) {
      await formatLog("error", `翻译 ${targetLang} 时出错: ${error.message}`);
      if (error.response?.data) {
        await formatLog("debug", `API错误详情:`, error.response.data);
      }
    }

    // 显示总体进度
    await showProgress(i + 1, targetLangs.length);
  }

  await formatLog("success", `\n✨ 目录 ${subDir || "根目录"} 处理完成！`);
}

/**
 * Translate JSON content with retry mechanism
 */
async function translateBatch(
  batch,
  batchIndex,
  totalBatches,
  sourceLang,
  targetLang
) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  const content = JSON.stringify(batch, null, 2);
  const requestData = {
    model: CONFIG.api.model,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT.replace("{{originLng}}", sourceLang).replace(
          "{{targetLng}}",
          targetLang
        ),
      },
      { role: "user", content },
    ],
  };

  // 创建状态指示器
  let dots = 0;
  const keys = Object.keys(batch);
  const firstKey = keys[0];
  const lastKey = keys[keys.length - 1];
  const previewContent = `[${
    batchIndex + 1
  }/${totalBatches}] ${firstKey} -> ${lastKey}`;

  const statusInterval = setInterval(() => {
    process.stdout.write(
      `\r📡 正在翻译${".".repeat(dots)} ${previewContent}   `
    );
    dots = (dots + 1) % 4;
  }, 500);

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        await formatLog(
          "warning",
          `第 ${attempt} 次重试翻译批次 ${batchIndex + 1}...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }

      const response = await axios.post(CONFIG.api.endpoint, requestData, {
        headers: {
          Authorization: `Bearer ${CONFIG.api.key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Translation Service",
        },
        timeout: 30000,
      });

      // 清除状态指示器
      clearInterval(statusInterval);
      process.stdout.write("\r" + " ".repeat(100) + "\r");

      const translatedContent = response.data.choices[0].message.content.trim();

      try {
        const parsedContent = JSON.parse(translatedContent);
        if (attempt > 1) {
          await formatLog("success", `✓ 重试成功！`);
        }
        await formatLog("success", `✓ 完成第 ${batchIndex + 1} 批翻译`);
        return parsedContent;
      } catch (parseError) {
        lastError = new Error(
          `JSON解析错误 (批次 ${batchIndex + 1}): ${
            parseError.message
          }\n原始内容: ${translatedContent}`
        );
        throw lastError;
      }
    } catch (error) {
      lastError = error;

      // 清除状态指示器
      clearInterval(statusInterval);
      process.stdout.write("\r" + " ".repeat(100) + "\r");

      if (attempt === MAX_RETRIES) {
        await formatLog(
          "error",
          `批次 ${batchIndex + 1} 翻译失败 (已重试 ${MAX_RETRIES} 次): ${
            error.message
          }`
        );
        throw error;
      }
    }
  }
}

async function translateJson(jsonData, sourceLang, targetLang) {
  await formatLog("info", `🔄 准备翻译 (${sourceLang} -> ${targetLang})`);

  // 将数据分批处理，每批15个键值对
  const BATCH_SIZE = 15;
  const entries = Object.entries(jsonData);
  const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

  // 准备所有批次
  const batches = Array.from({ length: totalBatches }, (_, batchIndex) => {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, entries.length);
    return {
      batch: Object.fromEntries(entries.slice(start, end)),
      start,
      end,
      index: batchIndex,
    };
  });

  await formatLog("info", `📦 将并发处理 ${totalBatches} 个批次`);

  // 并发处理所有批次
  try {
    const results = {};
    const batchPromises = batches.map(async ({ batch, start, end, index }) => {
      try {
        const batchResults = await translateBatch(
          batch,
          index,
          totalBatches,
          sourceLang,
          targetLang
        );
        Object.assign(results, batchResults);
        await showProgress(end, entries.length);
        return true;
      } catch (error) {
        await formatLog("error", `批次 ${index + 1} 失败: ${error.message}`);
        return false;
      }
    });

    // 等待所有批次完成
    const batchResults = await Promise.all(batchPromises);
    const successCount = batchResults.filter(Boolean).length;

    if (successCount === 0) {
      throw new Error("所有批次都失败了");
    }

    if (successCount < totalBatches) {
      await formatLog(
        "warning",
        `⚠️ 部分批次失败，只完成了 ${successCount}/${totalBatches} 个批次`
      );
    } else {
      await formatLog(
        "success",
        `✨ 所有批次翻译完成，共 ${entries.length} 个键值对`
      );
    }

    return results;
  } catch (error) {
    await formatLog("error", `翻译过程失败: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  const { default: chalk } = await import("chalk");

  try {
    // 检查必要的环境变量
    if (!CONFIG.api.key) {
      throw new Error("未设置 TRANSLATE_API_KEY 环境变量");
    }
    if (!CONFIG.api.model) {
      throw new Error("未设置 TRANSLATE_MODEL 环境变量");
    }

    // 检查目录是否存在
    if (!fs.existsSync(CONFIG.paths.baseDir)) {
      throw new Error(`目录不存在: ${CONFIG.paths.baseDir}`);
    }

    // 如果是直接处理目录
    if (!fs.statSync(CONFIG.paths.baseDir).isDirectory()) {
      throw new Error(`${CONFIG.paths.baseDir} 不是一个目录`);
    }

    console.log(chalk.blue(`\n📂 翻译目录: ${CONFIG.paths.baseDir}`));
    console.log(chalk.blue(`🔧 使用规则: ${params.useRules ? "是" : "否"}\n`));

    // 获取所有需要处理的目录
    const directories = [CONFIG.paths.baseDir];
    if (params.dir.startsWith("pages") && !params.dir.includes("/")) {
      // 如果是 pages 目录（但不是具体的子目录），还需要处理子目录
      const subDirs = fs
        .readdirSync(CONFIG.paths.baseDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => path.join(CONFIG.paths.baseDir, dirent.name));
      directories.push(...subDirs);
    }

    // 处理每个目录
    for (const dir of directories) {
      await processDirectory(dir);
    }

    console.log(chalk.green("\n🎉 所有翻译任务已完成！"));
  } catch (error) {
    console.error(chalk.red(`错误: ${error.message}`));
    process.exit(1);
  }
}

// Execute translation if running this file directly
if (require.main === module) {
  main();
}

// Export functions for testing or external use
module.exports = {
  translateJson,
  prepareForTranslation,
  shouldTranslateKey,
  cloneStructure,
};
