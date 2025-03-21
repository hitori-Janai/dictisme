/**
一个编辑框，读取chrome.storage.local中的dicts_meaning，并显示在编辑框中。编辑后，保存到chrome.storage.local中的dicts_meaning。
一个图片显示框，显示chrome.storage.local中的dicts_image中的图片。可以上传图片，并保存到chrome.storage.local中的dicts_image。
*/

<template>
  <div class="show-word-container">
    <div class="meaning-section">
      <!-- 单词输入区域 -->
      <div class="word-input-container">
        <input 
          v-model="word" 
          class="word-input"
          placeholder="请输入单词..."
          @input="debounceUpdateWord"
        />
        <div class="word-actions">
          <!-- 喇叭按钮 -->
          <div @click="playWordSound">
            <PlaySoundIcon/>
          </div>
          
          <div  @click="toggleCheck" >
            <CheckBoxIcon :status="status_check"/>
          </div>
          
          <!-- 收藏按钮 -->
          <div @click="toggleFavorite" >
            <FavBoxIcon :status="status_fav"/>
          </div>
        </div>
      </div>
      
      <!-- 词义文本区域 -->
      <textarea 
        v-model="meaning" 
        class="meaning-textarea"
        placeholder="请输入词义..."
        @input="debounceUpdate"
      ></textarea>
      <!-- <button @click="saveMeaning" class="save-btn">保存</button> -->
      <!-- <button @click="testMeaning" class="save-btn">testmean</button> -->
    </div>
    
    <div class="image-section">
      <!-- <h3>图片</h3> -->
      <div 
        class="image-preview" 
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
        :class="{ 'drag-over': isDragging }"
      >
        <img v-if="imageUrl" :src="imageUrl" alt="词义图片" />
        <div v-else class="no-image">
          <span>拖放图片到此处或点击上传</span>
        </div>
      </div>
      <div v-if="!isPopup" class="image-actions">
        <label for="image-upload" class="upload-btn">
          上传图片
          <input 
            type="file" 
            id="image-upload" 
            accept="image/*" 
            @change="handleImageUpload"
            class="hidden"
          />
        </label>
        <button v-if="imageUrl" @click="removeImage" class="remove-btn">删除图片</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CheckBoxIcon from './CheckBoxIcon.vue'
import FavBoxIcon from './FavBoxIcon.vue'
import PlaySoundIcon from './PlaySoundIcon.vue'
import { getDictsData, setDictsData, updateWordStatus } from '../utils/storage-utils'

const props = defineProps({
  initialWord: {
    type: String,
    default: ''
  },
  isPopup: {
    type: Boolean,
    default: false
  }
});

const word = ref('')
const meaning = ref('')
const imageUrl = ref('')
const status_check = ref(false)
const status_fav = ref(false)
let updateTimeout = null
const isDragging = ref(false)

// 加载数据
onMounted(async () => {
  try {

      if(props.initialWord){
        console.log('initialWord', props.initialWord)
        word.value = props.initialWord;
        await findWord(); // 加载该单词的信息
        const dictsData = await getDictsData();
        console.log('dictsData', dictsData)

      }

      const dictsData = await getDictsData();
      word.value = dictsData.dicts_word || '';
      meaning.value = dictsData.dicts_meaning || '';
      status_check.value = dictsData.dicts_status_check || false;
      status_fav.value = dictsData.dicts_status_fav || false;
      
      if (dictsData.dicts_image) {
        imageUrl.value = dictsData.dicts_image;
      }

    
    // 监控数据
    await storage.watch (
      'local:dicts_meaning',
      (newInstallDate, oldInstallDate) => {
        meaning.value = newInstallDate
      }
    );

    await storage.watch(
      'local:dicts_image',
      (newInstallDate, oldInstallDate) => {
        imageUrl.value = newInstallDate
      }
    );

    await storage.watch(
      'local:dicts_status_check',
      (newInstallDate, oldInstallDate) => {
        status_check.value = newInstallDate
      }
    );

    await storage.watch(
      'local:dicts_status_fav',
      (newInstallDate, oldInstallDate) => {
        status_fav.value = newInstallDate
      }
    );

  } catch (error) {
    console.error('加载数据失败:', error)
  }
})

// 查询单词
const findWord = async () => {
  try {

    // await setDictsData({ dicts_word: word.value })
    await getWordFromDB(word.value).then(async result => {
        console.log('getWordFromDB', result)
        const empty = {dicts_word: word.value, dicts_meaning: '', dicts_image: '', dicts_status_check: false, dicts_status_fav: false, dicts_count: 0, dicts_create_time: '', dicts_update_time: ''};
        await setDictsData(result == null ? empty : result)
    }).catch(error => {
        console.error('getWordFromDB', error)
    })

    console.log('单词已保存', word.value)
  } catch (error) {
    console.error('保存单词失败:', error)
  }
}

// 播放单词发音
const playWordSound = () => {
  if (!word.value) return
  
  // 使用Web Speech API播放单词发音
  const utterance = new SpeechSynthesisUtterance(word.value)
  utterance.lang = 'en-US'
  speechSynthesis.speak(utterance)
}

// 切换勾选状态
const toggleCheck = async () => {
  status_check.value = !status_check.value
  try {
    await updateWordStatus(word.value, status_check.value, status_fav.value)
  } catch (error) {
    console.error('保存勾选状态失败:', error)
  }
}

// 切换收藏状态
const toggleFavorite = async () => {
  status_fav.value = !status_fav.value
  try {
    await updateWordStatus(word.value, status_check.value, status_fav.value)
  } catch (error) {
    console.error('保存收藏状态失败:', error)
  }
}

// 防抖更新
const debounceUpdate = () => {
  clearTimeout(updateTimeout)
  updateTimeout = setTimeout(() => {
    saveMeaning()
  }, 1000) // 1秒后自动保存
}

const debounceUpdateWord = () => {
  clearTimeout(updateTimeout)
  updateTimeout = setTimeout(() => {
    findWord()
  }, 1000) // 1秒后自动保存
}

// 保存词义
const saveMeaning = async () => {
  try {
    await setDictsData({ dicts_meaning: meaning.value })
    console.log('词义已保存', meaning.value)
  } catch (error) {
    console.error('保存词义失败:', error)
  }
}

const testMeaning = async () => {

    console.log('testMeaning', meaning.value)

    chrome.storage.local.set({ asdhjk: "huhuh" }).then(() => {
        console.log("Value is set")
    })


    chrome.runtime.sendMessage(
      {
        action: 'getFavoriteWords'
      },
      (response) => {
        console.log('getFavoriteWords', response)
        if (response && response.success) {
        } else {
          console.log('getFavoriteWords', response)
        }
      }
    );


}

// 处理图片上传
const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = async (e) => {
    const imageData = e.target.result
    imageUrl.value = imageData
    
    try {
      await setDictsData({ dicts_image: imageData })
      console.log('图片已保存')
    } catch (error) {
      console.error('保存图片失败:', error)
    }
  }
  reader.readAsDataURL(file)
}

// 删除图片
const removeImage = async () => {
  try {
    imageUrl.value = ''
    await setDictsData({ dicts_image: null })
    console.log('图片已删除')
  } catch (error) {
    console.error('删除图片失败:', error)
  }
}

// 拖拽相关函数
const onDragOver = (event) => {
  isDragging.value = true;
  // 确保只接受图片文件
  if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
    const item = event.dataTransfer.items[0];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      // 允许放置
      event.dataTransfer.dropEffect = 'copy';
    } else {
      // 不允许放置
      event.dataTransfer.dropEffect = 'none';
    }
  }
};

const onDragLeave = () => {
  isDragging.value = false;
};

const onDrop = (event) => {
  isDragging.value = false;
  
  // 获取拖放的文件
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    
    // 检查是否为图片
    if (file.type.startsWith('image/')) {
      // 读取并处理图片
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        imageUrl.value = imageData;
        
        // 保存图片
        setDictsData({ dicts_image: imageData })
          .then(() => console.log('图片已保存'))
          .catch(error => console.error('保存图片失败:', error));
      };
      reader.readAsDataURL(file);
    }
  }
};
</script>

<style scoped>
.show-word-container {
  display: flex;
  flex-direction: column;
  /* gap: 20px; */
  /* padding: 16px; */
  max-width: 600px;
  margin: 0 0;
}

.meaning-section{
  border: 1px solid #ddd;
  border-radius: 8px;
  /* padding: 2px; */
  background-color: #f9f9f9;
  margin: 0 0;
}

.image-section {
  border: 1px solid #ddd;
  border-radius: 8px;
  /* padding: 2px; */
  background-color: #00000000;
  margin: 0;
  padding: 0;
}

h3 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #333;
}

.word-input-container {
  display: flex;
  align-items: center;
  /* margin-bottom: 16px; */
  gap: 10px;
}

.word-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.word-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #ccc;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background-color: #f0f0f0;
}

.icon-btn.active {
  background-color: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

.sound-btn:hover {
  color: #1890ff;
}

.check-btn.active {
  background-color: #f6ffed;
  border-color: #52c41a;
  color: #52c41a;
}

.fav-btn.active {
  background-color: #fff2f0;
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.meaning-textarea {
  width: 100%;
  min-height: 120px;
  /* padding: 8px; */
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  /* margin-bottom: 10px; */
}

.image-preview {
  width: 100%;
  height: 200px;
  border: 0px dashed #ccc;
  border-radius: 0px;
  display: flex;
  align-items: start;
  justify-content: center;
  overflow: hidden;
  /* margin-bottom: 10px; */
  background-color: rgba(255, 255, 255, 0);
  transition: all 0.3s ease;
}

.image-preview.drag-over {
  border-color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
  transform: scale(1.02);
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-image {
  color: #999;
  font-size: 14px;
  text-align: center;
  padding: 20px;
}

.image-actions {
  display: flex;
  gap: 10px;
}

.upload-btn, .remove-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.upload-btn {
  background-color: #4CAF50;
  color: white;
}

.upload-btn:hover {
  background-color: #45a049;
}

.remove-btn {
  background-color: #f44336;
  color: white;
}

.remove-btn:hover {
  background-color: #d32f2f;
}

.hidden {
  display: none;
}
</style>

