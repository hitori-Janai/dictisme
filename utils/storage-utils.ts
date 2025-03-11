import { storage } from 'wxt/storage';

// dicts 数据接口定义
export interface DictsData {
  dicts_word?: string;
  dicts_meaning?: string;
  dicts_image?: string;
  dicts_status_check?: boolean;
  dicts_status_fav?: boolean;
  dicts_count?: number;
  dicts_create_time?: string;
  dicts_update_time?: string;
}

/**
 * 获取所有 dicts 相关字段数据到一个对象
 * @returns Promise<DictsData> 包含所有 dicts 字段的对象
 */
export async function getDictsData(): Promise<DictsData> {
  try {
    const dicts_word = await storage.getItem('local:dicts_word');
    const dicts_meaning = await storage.getItem('local:dicts_meaning');
    const dicts_image = await storage.getItem('local:dicts_image');
    const dicts_status_check = await storage.getItem('local:dicts_status_check');
    const dicts_status_fav = await storage.getItem('local:dicts_status_fav');
    const dicts_count = await storage.getItem('local:dicts_count');
    const dicts_create_time = await storage.getItem('local:dicts_create_time');
    const dicts_update_time = await storage.getItem('local:dicts_update_time');

    return {
      dicts_word: dicts_word as string,
      dicts_meaning: dicts_meaning as string,
      dicts_image: dicts_image as string,
      dicts_status_check: dicts_status_check as boolean,
      dicts_status_fav: dicts_status_fav as boolean,
      dicts_count: dicts_count as number,
      dicts_create_time: dicts_create_time as string,
      dicts_update_time: dicts_update_time as string
    };
  } catch (error) {
    console.error('获取 dicts 数据失败:', error);
    throw error;
  }
}

/**
 * 从对象设置所有 dicts 相关字段数据
 * @param data DictsData 包含要设置的 dicts 字段的对象
 * @returns Promise<void>
 */
export async function setDictsData(data: DictsData): Promise<void> {
  try {
    const promises = [];

    console.log('setDictsData', data)

    if (data.dicts_word !== undefined) {
      promises.push(storage.setItem('local:dicts_word', data.dicts_word));
    }
    if (data.dicts_meaning !== undefined) {
      promises.push(storage.setItem('local:dicts_meaning', data.dicts_meaning));
    }
    if (data.dicts_image !== undefined) {
      promises.push(storage.setItem('local:dicts_image', data.dicts_image));
    }
    if (data.dicts_status_check !== undefined) {
      promises.push(storage.setItem('local:dicts_status_check', data.dicts_status_check));
    }
    if (data.dicts_status_fav !== undefined) {
      promises.push(storage.setItem('local:dicts_status_fav', data.dicts_status_fav));
    }
    if (data.dicts_count !== undefined) {
      promises.push(storage.setItem('local:dicts_count', data.dicts_count));
    }
    if (data.dicts_create_time !== undefined) {
      promises.push(storage.setItem('local:dicts_create_time', data.dicts_create_time));
    }
    if (data.dicts_update_time !== undefined) {
      promises.push(storage.setItem('local:dicts_update_time', data.dicts_update_time));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error('设置 dicts 数据失败:', error);
    throw error;
  }
}


/**
 * 更新单词状态
 * @param word 单词
 * @param statusCheck 是否已读
 * @param statusFav 是否收藏
 * @returns Promise<void>
 */
export async function updateWordStatus(
  word: string, 
  statusCheck: boolean, 
  statusFav: boolean
): Promise<void> {
  try {
    const now = new Date().toISOString();
    let count = await storage.getItem('local:dicts_count') as number || 0;
    
    // 更新数据
    await setDictsData({
      dicts_word: word,
      dicts_status_check: statusCheck,
      dicts_status_fav: statusFav,
      dicts_count: count + 1,
      dicts_update_time: now,
      // 如果是新单词，设置创建时间
      dicts_create_time: await storage.getItem('local:dicts_create_time') || now
    });
    
    // 同时发送消息到 background 进行 IndexedDB 存储
    chrome.runtime.sendMessage(
      {
        word: word,
        status_check: statusCheck,
        status_fav: statusFav
      },
      (response) => {
        console.log("收到 background 回复：", response);
      }
    );
  } catch (error) {
    console.error('更新单词状态失败:', error);
    throw error;
  }
} 

/**
 * 发送消息 getWord 从indexDb 查询一个单词详细信息 getFavoriteWords 获取所有收藏单词    
 */   

/**
 * 从 IndexedDB 查询单词详细信息
 * @param word 要查询的单词
 * @returns Promise<any> 单词详细信息
 */
export async function getWordFromDB(word: string): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'getWord',
        word: word
      },
      (response) => {
        if (response && response.success) {
          resolve(response.data);
        } else {
          console.error('getWordFromDB', response?.message || '查询单词失败');
          reject(response?.message || '查询单词失败');
        }
      }
    );
  });
}

/**
 * 从 IndexedDB 获取所有收藏的单词
 * @returns Promise<any[]> 收藏的单词列表
 */
export async function getFavoriteWordsFromDB(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'getFavoriteWords'
      },
      (response) => {
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(response?.message || '获取收藏单词失败');
        }
      }
    );
  });
}

/**
 * 从 IndexedDB 删除单词
 * @param word 要删除的单词
 * @returns Promise<string> 删除结果
 */
export async function deleteWordFromDB(word: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'deleteWord',
        word: word
      },
      (response) => {
        if (response && response.success) {
          resolve(response.message);
        } else {
          reject(response?.message || '删除单词失败');
        }
      }
    );
  });
}   
