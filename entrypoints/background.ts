export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // 初始化数据库
  const dbName = 'DictionaryDB';
  const dbVersion = 1;
  let db: IDBDatabase;

  // 打开数据库连接
  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onerror = (event) => {
        console.error('数据库打开失败:', event);
        reject('数据库打开失败');
      };

      request.onsuccess = (event) => {
        db = (event.target as IDBOpenDBRequest).result;
        console.log('数据库连接成功');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建单词存储对象
        if (!db.objectStoreNames.contains('words')) {
          const store = db.createObjectStore('words', { keyPath: 'dicts_word' });

          // 创建索引
          store.createIndex('by_status_fav', 'dicts_status_fav', { unique: false });
          store.createIndex('by_status_check', 'dicts_status_check', { unique: false });
          store.createIndex('by_create_time', 'dicts_create_time', { unique: false });
          store.createIndex('by_update_time', 'dicts_update_time', { unique: false });

          console.log('数据库表结构初始化完成');
        }
      };
    });
  };

  // 确保数据库已打开
  const ensureDB = async (): Promise<IDBDatabase> => {
    if (!db) {
      return await openDB();
    }
    return db;
  };

  // 添加或更新单词
  const saveWord = async (wordData: DictsData): Promise<string> => {
    await ensureDB();

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const transaction = db.transaction(['words'], 'readwrite');
      const store = transaction.objectStore('words');

      // 先检查单词是否存在
      const getRequest = store.get(wordData.dicts_word || '');

      getRequest.onsuccess = (event) => {
        const existingWord = getRequest.result;
        let wordObj;

        if (existingWord) {
          // 更新现有单词
          wordObj = {
            ...existingWord,
            dicts_meaning: wordData.dicts_meaning || existingWord.dicts_meaning,
            dicts_image: wordData.dicts_image || existingWord.dicts_image,
            dicts_status_check: wordData.dicts_status_check !== undefined ? wordData.dicts_status_check : existingWord.dicts_status_check,
            dicts_status_fav: wordData.dicts_status_fav !== undefined ? wordData.dicts_status_fav : existingWord.dicts_status_fav,
            dicts_count: existingWord.dicts_count + 1,
            dicts_update_time: now
          };
        } else {
          // 创建新单词
          wordObj = {
            dicts_word: wordData.dicts_word || '',
            dicts_meaning: wordData.dicts_meaning || '',
            dicts_image: wordData.dicts_image || '',
            dicts_status_check: wordData.dicts_status_check || false,
            dicts_status_fav: wordData.dicts_status_fav || false,
            dicts_count: 1,
            dicts_create_time: now,
            dicts_update_time: now
          };
        }

        const saveRequest = store.put(wordObj);

        saveRequest.onsuccess = () => {
          resolve('单词保存成功');
          // 如果是收藏状态变化，通知内容脚本
          if (wordData.dicts_status_fav !== undefined) {
            notifyFavoriteWordsChanged();
          }
        };

        saveRequest.onerror = (event) => {
          console.error('保存单词失败:', event);
          reject('保存单词失败');
        };
      };

      getRequest.onerror = (event) => {
        console.error('获取单词失败:', event);
        reject('获取单词失败');
      };
    });
  };

  // 获取单词
  const getWord = async (word: string): Promise<any> => {
    await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['words'], 'readonly');
      const store = transaction.objectStore('words');
      const request = store.get(word || '');

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.error('获取单词失败:', event);
        reject('获取单词失败');
      };
    });
  };

  // 删除单词
  const deleteWord = async (word: string): Promise<string> => {
    await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['words'], 'readwrite');
      const store = transaction.objectStore('words');
      const request = store.delete(word || '');

      request.onsuccess = () => {
        resolve('单词删除成功');
      };

      request.onerror = (event) => {
        console.error('删除单词失败:', event);
        reject('删除单词失败');
      };
    });
  };

  // 获取所有收藏的单词
  const getFavoriteWords = async (): Promise<any[]> => {
    console.log('getFavoriteWords 开始执行');
    await ensureDB();

    return new Promise((resolve, reject) => {
      console.log('getFavoriteWords 开始查询');
      const transaction = db.transaction(['words'], 'readonly');
      const store = transaction.objectStore('words');
      
      // 不使用索引直接获取所有单词，然后在内存中过滤
      const request = store.getAll();
      
      request.onsuccess = () => {
        // 在内存中过滤出 dicts_status_fav 为 true 的记录
        const allWords = request.result || [];
        const favoriteWords = allWords.filter(word => word.dicts_status_fav === true);
        console.log('获取到收藏单词数量:', favoriteWords.length);
        resolve(favoriteWords);
      };

      request.onerror = (event) => {
        console.error('获取收藏单词失败:', event);
        reject('获取收藏单词失败');
      };
    });
  };

  /**
   * 写两个方法，一个获取local:dicts所有字段据到一个对象。一个是set local:dicts 数据from一个对象
   */

  // 监听消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('addListener收到消息', request);

    // 处理单词状态更新
    if (request.word && (request.status_check === true || request.status_fav === true)) {
      // 使用立即执行的异步函数来处理
      (async () => {
        const dictsData = await getDictsData();
        console.log('dictsData', dictsData);
        // 保存到 IndexedDB
        try {
          const result = await saveWord(dictsData);
          console.log(result);
          sendResponse({ success: true, message: result });
        } catch (error) {
          console.error(error);
          sendResponse({ success: false, message: error });
        }
      })();
      return true;
    }

    // 删除单词
    if (request.word && request.status_check === false && request.status_fav === false) {
      deleteWord(request.word)
        .then(result => {
          sendResponse({ success: true, message: result });
        })
        .catch(error => {
          sendResponse({ success: false, message: error });
        });

      return true;
    }

    // 处理其他类型的请求
    if (request.word && request.action == 'getWord') {
      console.log('getWord enter', request.word)
      getWord(request.word)
        .then(result => {
          console.log('getWord', result)
          sendResponse({ success: true, data: result });
        })
        .catch(error => {
          console.error('getWord', error)
          sendResponse({ success: false, message: error });
        });

      return true;
    }

    if (request.action == 'deleteWord') {
      deleteWord(request.word)
        .then(result => {
          sendResponse({ success: true, message: result });
        })
        .catch(error => {
          sendResponse({ success: false, message: error });
        });

      return true;
    }

    if (request.action == 'getFavoriteWords') {
      console.log('getFavoriteWords.request START')
      getFavoriteWords()
        .then(result => {
          console.log('request.action getFavoriteWords.then', result)
          sendResponse({ success: true, data: result });
        })
        .catch(error => {
          console.log('request.action getFavoriteWords.catch', error)
          sendResponse({ success: false, message: error });
        });

      return true;
    }

    if (request.action === 'getDictsData') {
      getDictsData()
        .then(result => {
          sendResponse({ success: true, data: result });
        })
        .catch(error => {
          sendResponse({ success: false, message: error.message });
        });

      return true;
    }

    if (request.action === 'setDictsData') {
      setDictsData(request.data)
        .then(() => {
          sendResponse({ success: true, message: 'Dicts 数据保存成功' });
        })
        .catch(error => {
          sendResponse({ success: false, message: error.message });
        });

      return true;
    }
  });

  // 初始化数据库
  openDB().catch(error => console.error('初始化数据库失败:', error));

  // 在 updateWordStatus 函数中添加通知逻辑
  const notifyFavoriteWordsChanged = () => {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: 'favoriteWordsUpdated' })
            .catch(err => console.log(`无法发送消息到标签页 ${tab.id}:`, err));
        }
      });
    });
  };
});
