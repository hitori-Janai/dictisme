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
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        width: 350px;
        padding: 10px;
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
      `;
      closeBtn.onclick = removePopup;
      popup.appendChild(closeBtn);
      
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
    }
    
    // 移除弹窗
    function removePopup() {
      if (popup) {
        document.body.removeChild(popup);
        popup = null;
      }
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
      
      // 添加点击事件处理
      document.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        
        // 点击高亮单词
        if (target.classList.contains('wxt-highlighted-word')) {
          event.preventDefault();
          event.stopPropagation();
          
          const word = target.dataset.word;
          if (word) {
            const rect = target.getBoundingClientRect();
            createPopup(word, { 
              x: rect.left, 
              y: rect.bottom + 10 
            });
          }
        }
        // 点击其他区域关闭弹窗
        else if (popup && !popup.contains(target)) {
          removePopup();
        }
      });
    }
    
    // 添加样式
    function addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .wxt-highlighted-word {
          background-color: #ffeb3b;
          border-radius: 2px;
          padding: 0 2px;
          cursor: pointer;
        }
        .wxt-highlighted-word:hover {
          background-color: #ffc107;
        }
      `;
      document.head.appendChild(style);
    }
    
    // 初始化
    async function initialize() {
      try {
        // 获取收藏单词
        const words = await getFavoriteWordsFromDB();
        console.log('获取收藏单词 words', words)
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
