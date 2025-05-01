// 控制开关，方便随时取消功能
let isRuPathDelayEnabled = true;

/**
 * 为俄语路径用户添加隐藏延迟
 * @param locale 当前语言路径
 * @returns Promise<void>
 */
export async function addDelayForRuPath(locale: string): Promise<void> {
  // 如果功能被禁用，直接返回
  if (!isRuPathDelayEnabled) return;
  
  // 检查是否是俄语路径
  if (locale === 'ru') {
    // 返回一个Promise，20秒后resolve
    return new Promise(resolve => setTimeout(resolve, 20000));
  }
}

/**
 * 启用或禁用俄语路径延迟功能
 * @param enabled 是否启用
 */
export function setRuPathDelayEnabled(enabled: boolean): void {
  isRuPathDelayEnabled = enabled;
} 