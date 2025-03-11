/**

*/


<script lang="ts" setup>
import ShowWord from './ShowWord.vue';
import { ref } from 'vue';
import { getFavoriteWordsFromDB } from '../utils/storage-utils';

const fileInput = ref<HTMLInputElement | null>(null);
const message = ref('');
const isError = ref(false);

// 导出数据
const exportData = async () => {
  try {
    message.value = '正在导出数据...';
    isError.value = false;
    
    // 发送消息到 background 获取所有单词数据
    chrome.runtime.sendMessage(
      { action: 'getAllWords' },
      (response) => {
        if (response && response.success) {
          const data = response.data;
          
          // 创建 JSON 文件
          const jsonData = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          
          // 创建下载链接
          const a = document.createElement('a');
          a.href = url;
          a.download = `dictionary_backup_${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          
          // 清理
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            message.value = '数据导出成功！';
          }, 100);
        } else {
          message.value = '导出失败: ' + (response?.message || '未知错误');
          isError.value = true;
        }
      }
    );
  } catch (error) {
    message.value = '导出失败: ' + (error instanceof Error ? error.message : String(error));
    isError.value = true;
  }
};

// 触发文件选择
const importData = () => {
  fileInput.value?.click();
};

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  
  message.value = '正在导入数据...';
  isError.value = false;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const result = e.target?.result;
      if (typeof result !== 'string') {
        throw new Error('无法读取文件内容');
      }
      
      const data = JSON.parse(result);
      
      // 发送数据到 background 进行导入
      chrome.runtime.sendMessage(
        { 
          action: 'importWords',
          data: data
        },
        (response) => {
          if (response && response.success) {
            message.value = `成功导入 ${response.count} 个单词！`;
            isError.value = false;
          } else {
            message.value = '导入失败: ' + (response?.message || '未知错误');
            isError.value = true;
          }
        }
      );
    } catch (error) {
      message.value = '解析文件失败: ' + (error instanceof Error ? error.message : String(error));
      isError.value = true;
    }
    
    // 重置文件输入
    if (target) {
      target.value = '';
    }
  };
  
  reader.onerror = () => {
    message.value = '读取文件失败';
    isError.value = true;
  };
  
  reader.readAsText(file);
};
</script>

<template>
  <ShowWord/>
  <div class="op-words-container">
    <h2>单词操作</h2>
    
    <div class="button-group">
      <button @click="exportData" class="export-btn">
        导出数据备份
      </button>
      <button @click="importData" class="import-btn">
        导入数据备份
      </button>
      <input 
        type="file" 
        ref="fileInput" 
        @change="handleFileUpload" 
        accept=".json" 
        style="display: none"
      />
    </div>
    
    <div v-if="message" class="message" :class="{ 'error': isError }">
      {{ message }}
    </div>
  </div>
</template>

<style scoped>
.op-words-container {
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 20px;
}

h2 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.export-btn {
  background-color: #4CAF50;
  color: white;
}

.export-btn:hover {
  background-color: #45a049;
}

.import-btn {
  background-color: #2196F3;
  color: white;
}

.import-btn:hover {
  background-color: #0b7dda;
}

.message {
  padding: 10px;
  border-radius: 4px;
  background-color: #e8f5e9;
  color: #2e7d32;
  margin-top: 10px;
}

.message.error {
  background-color: #ffebee;
  color: #c62828;
}
</style>