
export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // 监听消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息', request)
    console.log('收到消息', request.word, request.status_check, request.status_fav)

    sendResponse({
      status: true
    })
    // 模拟异步操作
    return true; // 保持通道开放，等待异步操作
  });


});
