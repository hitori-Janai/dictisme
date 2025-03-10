/**
一个编辑框，读取chrome.storage.local中的dicts_meaning，并显示在编辑框中。编辑后，保存到chrome.storage.local中的dicts_meaning。
一个图片显示框，显示chrome.storage.local中的dicts_image中的图片。可以上传图片，并保存到chrome.storage.local中的dicts_image。
*/
import { storage } from 'wxt/storage';
<template>
  <div class="show-word-container">
    <div class="meaning-section">
      <h3>词义</h3>
      <textarea 
        v-model="meaning" 
        class="meaning-textarea"
        placeholder="请输入词义..."
        @input="debounceUpdate"
      ></textarea>
      <button @click="saveMeaning" class="save-btn">保存</button>
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

const meaning = ref('')
const imageUrl = ref('')
let updateTimeout = null

// 加载数据
onMounted(async () => {
  try {
    const dicts_meaning = await storage.getItem('local:dicts_meaning');
    const dicts_image = await storage.getItem('local:dicts_image');
    meaning.value = dicts_meaning || ''
    
    if (dicts_image) {
      imageUrl.value = dicts_image
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
})

// 防抖更新
const debounceUpdate = () => {
  clearTimeout(updateTimeout)
  updateTimeout = setTimeout(() => {
    saveMeaning()
  }, 1000) // 1秒后自动保存
}

// 保存词义
const saveMeaning = async () => {
  try {
    await storage.setItem('local:dicts_meaning', meaning.value);
    console.log('词义已保存', meaning.value)
  } catch (error) {
    console.error('保存词义失败:', error)
  }
}

const testMeaning = async () => {
    await storage.setItem('local:preference', "helloworld")
    console.log('testMeaning', meaning.value)
    const dicts_meaning = await storage.getItem('local:dicts_meaning');
    console.log('dicts_meaning', dicts_meaning)


    chrome.storage.local.set({ asdhjk: "huhuh" }).then(() => {
        console.log("Value is set");
    });
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
      await storage.setItem('local:dicts_image', imageData);
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
    await storage.local.remove('dicts_image')
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

