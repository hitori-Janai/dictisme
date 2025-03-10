import { createApp } from 'vue';
import './style.css';
import App from './App.vue';

// 1. Import the components you need
import { Button } from 'vant';
// 2. Import the components style
import 'vant/lib/index.css';

const app = createApp(App);

// 3. Register the components you need
app.use(Button);

app.mount('#app');