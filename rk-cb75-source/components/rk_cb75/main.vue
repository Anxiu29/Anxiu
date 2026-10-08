<template>
    <div class="cb75-profile-panel">
        <MainMeun />
    </div>
    <div class="cb75-editor flex-1">
        <div class="d-flex flex-column h-100">
            <div class="cb75-nav-stage">
                <Nav />
            </div>
            <div class="cb75-key-stage d-flex jc-center ai-center flex-1">
                <Key />
            </div>
            <div class="cb75-function-stage d-flex mx-1">
                <div class="w-100">
                    <Fun />
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import MainMeun from "./mainMenu.vue";
import Key from "./key.vue";
import Nav from "./nav.vue";
import Fun from "./fun.vue";
</script>
<style scoped lang="scss">
.cb75-profile-panel { flex: 0 0 260px; min-width: 0; min-height: 0; }
.cb75-editor { min-width: 0; min-height: 0; }
.cb75-editor > div { min-height: 0; }
.cb75-nav-stage { flex: none; }
.cb75-key-stage { min-width: 0; min-height: 230px; overflow: auto; align-items: safe center; }
.cb75-function-stage { flex: 0 0 275px; min-width: 0; min-height: 0; overflow: hidden; }
.cb75-function-stage > div { min-width: 0; }
@media (max-width: 1100px) {
  .cb75-profile-panel { flex-basis: 210px; }
}
@media (max-width: 900px) {
  .cb75-profile-panel { height: 235px; width: 100%; }
  .cb75-editor { width: 100%; }
  .cb75-editor > div { height: auto; }
  .cb75-key-stage { min-height: 280px; padding-block: 12px; }
  .cb75-function-stage { height: 280px; margin: 0 10px 16px; }
}
</style>
