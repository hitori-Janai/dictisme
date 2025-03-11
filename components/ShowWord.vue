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
      <button @click="testMeaning" class="save-btn">testmean</button>
    </div>
    
    <div class="image-section">
      <h3>图片</h3>
      <div class="image-preview">
        <img v-if="imageUrl" :src="imageUrl" alt="词义图片" />
        <div v-else class="no-image">暂无图片</div>
      </div>
      <div class="image-actions">
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
import { storage } from 'wxt/storage'
import CheckBoxIcon from './CheckBoxIcon.vue'
import FavBoxIcon from './FavBoxIcon.vue'
import PlaySoundIcon from './PlaySoundIcon.vue'

const word = ref('')
const meaning = ref('')
const imageUrl = ref('')
const status_check = ref(false)
const status_fav = ref(false)
let updateTimeout = null

// 加载数据
onMounted(async () => {
  try {
    const dicts_word = await storage.getItem('local:dicts_word')
    const dicts_meaning = await storage.getItem('local:dicts_meaning')
    const dicts_image = await storage.getItem('local:dicts_image')
    const dicts_status_check = await storage.getItem('local:dicts_status_check')
    const dicts_status_fav = await storage.getItem('local:dicts_status_fav')
    
    word.value = dicts_word || ''
    meaning.value = dicts_meaning || ''
    status_check.value = dicts_status_check || false
    status_fav.value = dicts_status_fav || false
    
    if (dicts_image) {
      imageUrl.value = dicts_image
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
})

// 保存单词
const saveWord = async () => {
  try {
    await storage.setItem('local:dicts_word', word.value)
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
    await storage.setItem('local:dicts_status_check', status_check.value)
    // 发送消息到background
    chrome.runtime.sendMessage(
      {
        word: word.value,
        status_check: status_check.value,
        status_fav: status_fav.value
      },
      (response) => {
        console.log("收到回复：", response);
      }
    );
  } catch (error) {
    console.error('保存勾选状态失败:', error)
  }
}

// 切换收藏状态
const toggleFavorite = async () => {
  status_fav.value = !status_fav.value
  try {
    await storage.setItem('local:dicts_status_fav', status_fav.value)
    // 发送消息到background
    chrome.runtime.sendMessage(
      {
        word: word.value,
        status_check: status_check.value,
        status_fav: status_fav.value
      },
      (response) => {
        console.log("收到回复：", response);
      }
    );
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
    saveWord()
  }, 1000) // 1秒后自动保存
}

// 保存词义
const saveMeaning = async () => {
  try {
    await storage.setItem('local:dicts_meaning', meaning.value)
    console.log('词义已保存', meaning.value)
  } catch (error) {
    console.error('保存词义失败:', error)
  }
}

const testMeaning = async () => {
    await storage.setItem('local:preference', "helloworld")
    console.log('testMeaning', meaning.value)
    const dicts_meaning = await storage.getItem('local:dicts_meaning')
    console.log('dicts_meaning', dicts_meaning)

    chrome.storage.local.set({ asdhjk: "huhuh" }).then(() => {
        console.log("Value is set")
    })
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
      await storage.setItem('local:dicts_image', imageData)
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
    await storage.removeItem('local:dicts_image')
    console.log('图片已删除')
  } catch (error) {
    console.error('删除图片失败:', error)
  }
}
</script>

<style scoped>
.show-word-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.meaning-section, .image-section {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  background-color: #f9f9f9;
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
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 10px;
}

.image-preview {
  width: 100%;
  height: 200px;
  border: 1px dashed #ccc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 10px;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-image {
  color: #999;
  font-size: 14px;
}

.image-actions {
  display: flex;
  gap: 10px;
}

.upload-btn, .save-btn, .remove-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-block;
}

.upload-btn {
  background-color: #4CAF50;
  color: white;
}

.save-btn {
  background-color: #2196F3;
  color: white;
}

.remove-btn {
  background-color: #f44336;
  color: white;
}

.hidden {
  display: none;
}
</style>

