import { createApp, h } from 'vue';
import { getFavoriteWordsFromDB } from '../utils/storage-utils';
import ShowWord from '../components/ShowWord.vue';

export default defineContentScript({
  matches: ['*://*/*'], // 匹配所有网页
  main() {
    console.log('Dictionary content script loaded');
    
    // 存储收藏的单词列表
    let favoriteWords: string[] = [];
    // 当前显示的悬浮组件
    let popup: HTMLElement | null = null;
    // 当前悬浮的单词元素
    let currentHighlightedElement: HTMLElement | null = null;
    // 悬浮延迟定时器
    let hoverTimer: number | null = null;
    
    // 创建悬浮显示的容器
    function createPopup(word: string, position: { x: number, y: number }) {
      // 移除现有弹窗
      removePopup();
      
      // 创建新弹窗
      popup = document.createElement('div');
      popup.className = 'wxt-word-popup';
      popup.style.cssText = `
        position: fixed;
        top: ${position.y}px;
        left: ${position.x}px;
        z-index: 9999;
        background: rgba(255, 255, 255, 0);
        backdrop-filter: blur(1px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 1px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0);
        width: 350px;
        padding: 0px;
        border: 1px solid rgba(255, 255, 255, 0);
      `;
      
      // 创建关闭按钮
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: rgba(0, 0, 0, 0.5);
        transition: color 0.2s;
      `;
      closeBtn.onmouseover = () => {
        closeBtn.style.color = 'rgba(0, 0, 0, 0.8)';
      };
      closeBtn.onmouseout = () => {
        closeBtn.style.color = 'rgba(0, 0, 0, 0.5)';
      };
      closeBtn.onclick = removePopup;
      // popup.appendChild(closeBtn);
      
      // 创建Vue应用挂载点
      const mountPoint = document.createElement('div');
      popup.appendChild(mountPoint);
      
      // 挂载Vue组件
      const app = createApp({
        render() {
          return h(ShowWord, { initialWord: word, isPopup: true });
        }
      });
      app.mount(mountPoint);
      
      // 添加到页面
      document.body.appendChild(popup);
      
      // 添加鼠标事件，允许在弹窗内移动不关闭
      popup.addEventListener('mouseenter', () => {
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
      });
      
      popup.addEventListener('mouseleave', () => {
        removePopupWithDelay();
      });
    }
    
    // 移除弹窗
    function removePopup() {
      if (popup) {
        document.body.removeChild(popup);
        popup = null;
      }
    }
    
    // 延迟移除弹窗（提供更好的用户体验）
    function removePopupWithDelay() {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }
      
      hoverTimer = window.setTimeout(() => {
        removePopup();
        currentHighlightedElement = null;
      }, 300); // 300ms延迟，避免鼠标短暂离开就关闭
    }
    
    // 高亮页面上的单词
    function highlightWords() {
      // 如果没有收藏单词，不执行操作
      if (favoriteWords.length === 0) return;
      
      // 创建TreeWalker遍历文本节点
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            // 跳过脚本、样式等标签中的文本
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            const tagName = parent.tagName.toLowerCase();
            if (tagName === 'script' || tagName === 'style' || 
                tagName === 'noscript' || tagName === 'svg' ||
                parent.classList.contains('wxt-word-popup')) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // 接受有内容的文本节点
            return node.textContent && node.textContent.trim().length > 0
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        }
      );
      
      // 收集需要处理的节点
      const textNodes = [];
      let currentNode;
      while (currentNode = walker.nextNode()) {
        textNodes.push(currentNode);
      }
      
      // 处理文本节点
      textNodes.forEach(node => {
        let text = node.textContent || '';
        let changed = false;
        
        // 检查每个收藏单词
        favoriteWords.forEach(word => {
          // 使用单词边界确保匹配完整单词
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          if (regex.test(text)) {
            changed = true;
            // 替换文本，添加高亮标记
            text = text.replace(regex, match => 
              `<span class="wxt-highlighted-word" data-word="${match.toLowerCase()}">${match}</span>`
            );
          }
        });
        
        // 如果有变化，替换节点
        if (changed) {
          const fragment = document.createRange().createContextualFragment(text);
          node.parentNode?.replaceChild(fragment, node);
        }
      });
      
      // 为所有高亮单词添加鼠标悬浮事件
      const highlightedWords = document.querySelectorAll('.wxt-highlighted-word');
      highlightedWords.forEach(element => {
        element.addEventListener('mouseenter', (event) => {
          const target = event.target as HTMLElement;
          const word = target.dataset.word;
          
          // 清除之前的定时器
          if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
          }
          
          // 如果悬浮在不同的单词上，先关闭之前的弹窗
          if (currentHighlightedElement && currentHighlightedElement !== target) {
            removePopup();
          }
          
          currentHighlightedElement = target;
          
          if (word) {
            const rect = target.getBoundingClientRect();
            createPopup(word, { 
              x: rect.left, 
              y: rect.bottom + 10 
            });
          }
        });
        
        element.addEventListener('mouseleave', () => {
          removePopupWithDelay();
        });
      });
      
      // 点击页面其他区域关闭弹窗
      document.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        if (popup && !popup.contains(target) && 
            (!currentHighlightedElement || !currentHighlightedElement.contains(target))) {
          removePopup();
          currentHighlightedElement = null;
        }
      });
    }
    
    // 添加样式
    function addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .wxt-highlighted-word {
          color: #e91e63;
          font-weight: 500;
          text-decoration: underline;
          text-decoration-color: #e91e63;
          text-decoration-thickness: 1px;
          text-underline-offset: 2px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .wxt-highlighted-word:hover {
          color: #c2185b;
          text-decoration-thickness: 2px;
        }
      `;
      document.head.appendChild(style);
    }
    
    // 初始化
    async function initialize() {
      try {
        // 获取收藏单词
        const words = await getFavoriteWordsFromDB();
        console.log('获取收藏单词 words', words);
        favoriteWords = words.map(item => item.dicts_word.toLowerCase());
        console.log(`Loaded ${favoriteWords.length} favorite words`);
        
        if (favoriteWords.length > 0) {
          addStyles();
          highlightWords();
        }
      } catch (error) {
        console.error('Failed to initialize dictionary:', error);
      }
    }
    
    // 监听收藏单词变化
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'favoriteWordsUpdated') {
        // 重新加载并高亮
        initialize();
        sendResponse({ success: true });
      }
      return true;
    });
    
    // 启动
    initialize();
  }
});
