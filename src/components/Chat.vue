<template>
  <div class="fixed top-0 right-0 flex h-screen w-32 -z-10" v-if="open != true">
    <div class="my-32 w-full flex items-center justify-center" @mouseover="open = true">
      <button type="button" class="rounded-md text-base hover:text-gray-50 focus:outline-none" @click="open = true" @touchstart="open = true">
        <span class="sr-only">Open panel</span>
        <ChevronLeftIcon class="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  </div>
  <TransitionRoot as="template" :show="open">
    <div class="fixed inset-y-0 right-0 flex max-w-full pl-10">
      <TransitionChild as="template" enter="transform transition ease-in-out duration-500 sm:duration-700" enter-from="translate-x-full" enter-to="translate-x-0" leave="transform transition ease-in-out duration-500 sm:duration-700" leave-from="translate-x-0" leave-to="translate-x-full">
        <div class="w-screen max-w-md">
          <div class="flex h-full flex-col bg-transparent">
            <div class="flex min-h-0 flex-1 flex-col overflow-y-scroll py-6">
              <div class="px-4 sm:px-6">
                <div class="flex items-start justify-between">
                  <div class="text-base font-semibold leading-6 uppercase">
                    {{ title }}
                  </div>
                  <div class="ml-3 flex h-7 items-center">
                    <button type="button" class="rounded-md text-base hover:text-gray-50 focus:outline-none" @click="open = false">
                      <span class="sr-only">Close panel</span>
                      <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="relative mt-6 flex-1 px-4 sm:px-6">
                <div v-if="isPending" class="bg-black bg-opacity-50 text-green-400 rounded-md p-5 mb-5">Waiting for response...</div>
                <div class="bg-black bg-opacity-50 rounded-md p-5 overflow-x-auto">
                  <pre v-if="response.length > 0" class="whitespace-pre-wrap">{{ response }}</pre>
                  <div v-else-if="!isPending">There was no response. Please try another request or try again.</div>
                </div>
                <div v-if="error" class="my-5 p-3 rounded-md bg-red-600 bg-opacity-50">
                  <div>{{ error }}</div>
                </div>
                <div v-if="!isFetching" class="my-5">
                  <button type="button" class="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100" @click="emitRegenerateEvent">
                    <ArrowPathIcon class="h-5 w-5 inline-block" aria-hidden="true" />
                    Regenerate response
                  </button>
                </div>
              </div>
            </div>
            <div class="flex flex-shrink-0 flex-col justify-end px-4 py-4">
              <form @submit.prevent="emitSendEvent" class="mt-auto w-full">
                <div class="relative mt-2 rounded-md shadow-sm">
                  <input type="text" v-model="prompt" class="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 md:text-base sm:text-sm sm:leading-6" placeholder="Send a request." />
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <PaperAirplaneIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
              </form>
              <div class="mt-2 flex flex-col items-end gap-1 text-xs opacity-50">
                <p>Powered by OpenAI</p>
              </div>
            </div>
          </div>
        </div>
      </TransitionChild>
    </div>
  </TransitionRoot>
</template>

<script setup>
import { ref, watchEffect } from "vue";
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from "@headlessui/vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { ChevronLeftIcon } from "@heroicons/vue/24/outline";
import { PaperAirplaneIcon, ArrowPathIcon } from "@heroicons/vue/20/solid";

const props = defineProps({
  modelValue: String,
  title: String,
  response: String,
  error: String,
  messages: Object,
  isPending: Boolean,
  isFetching: Boolean,
});

const open = ref(true);
const prompt = ref(props.modelValue);

watchEffect(() => {
  prompt.value = props.modelValue;
});

const emits = defineEmits(["update:modelValue", "send", "regenerate"]);

function emitSendEvent() {
  emits("send");
}

function emitRegenerateEvent() {
  emits("regenerate");
}

watchEffect(() => {
  emits("update:modelValue", prompt.value);
});
</script>