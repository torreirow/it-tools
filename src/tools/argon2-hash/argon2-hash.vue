<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { argon2d, argon2i, argon2id } from 'hash-wasm';
import { useThemeVars } from 'naive-ui';
import { useQueryParamOrStorage } from '@/composable/queryParams';
import {
  ARGON2_PRESETS,
  type Argon2Issue,
  type Argon2Params,
  type Argon2PresetName,
  type Argon2Variant,
  matchPreset,
  parseHexSalt,
  validateParams,
  verifyArgon2,
} from './argon2-hash.service';

const { t } = useI18n();
const themeVars = useThemeVars();
const defaults: Argon2Params = ARGON2_PRESETS.authelia;

// Inputs
const password = ref('');
const algorithm = useQueryParamOrStorage<Argon2Variant>({
  name: 'algo',
  storageName: 'argon2:a',
  defaultValue: defaults.variant,
});

// Parameters
const salt = useQueryParamOrStorage({ name: 'salt', storageName: 'argon2:s', defaultValue: '' });
const iterations = useQueryParamOrStorage({ name: 'iter', storageName: 'argon2:i', defaultValue: defaults.iterations });
const memorySizeKB = useQueryParamOrStorage({
  name: 'memory',
  storageName: 'argon2:m',
  defaultValue: defaults.memorySizeKB,
});
const parallelism = useQueryParamOrStorage({
  name: 'paral',
  storageName: 'argon2:p',
  defaultValue: defaults.parallelism,
});
const hashLength = useQueryParamOrStorage({ name: 'len', storageName: 'argon2:l', defaultValue: defaults.hashLength });
const saltLength = useQueryParamOrStorage({
  name: 'saltlen',
  storageName: 'argon2:sl',
  defaultValue: defaults.saltLength,
});
const outputType = useQueryParamOrStorage<'hex' | 'encoded' | 'binary'>({
  name: 'output',
  storageName: 'argon2:o',
  defaultValue: 'encoded',
});

const params = computed(() => ({
  variant: algorithm.value,
  iterations: iterations.value,
  memorySizeKB: memorySizeKB.value,
  parallelism: parallelism.value,
  hashLength: hashLength.value,
  saltLength: saltLength.value,
}));

// The preset is derived from the parameters, so it can never disagree with them.
const preset = computed<Argon2PresetName | 'custom'>({
  get: () => matchPreset(params.value),
  set: (name) => {
    if (name === 'custom') {
      return;
    }
    const p = ARGON2_PRESETS[name];
    algorithm.value = p.variant;
    iterations.value = p.iterations;
    memorySizeKB.value = p.memorySizeKB;
    parallelism.value = p.parallelism;
    hashLength.value = p.hashLength;
    saltLength.value = p.saltLength;
  },
});
const presetOptions = computed(() => [
  { label: t('tools.argon2-hash.texts.label-preset-authelia'), value: 'authelia' },
  { label: t('tools.argon2-hash.texts.label-preset-owasp'), value: 'owasp' },
  { label: t('tools.argon2-hash.texts.label-preset-custom'), value: 'custom', disabled: true },
]);

const validation = computed(() => validateParams(params.value, salt.value));

function issueMessage(issue: Argon2Issue) {
  switch (issue.kind) {
    case 'missing-value':
      return t('tools.argon2-hash.texts.error-missing-value');
    case 'memory-too-low':
      return t('tools.argon2-hash.texts.error-memory-too-low', { min: issue.min });
    case 'memory-too-high':
      return t('tools.argon2-hash.texts.error-memory-too-high', { max: issue.max });
    case 'memory-high':
      return t('tools.argon2-hash.texts.warning-memory-high', { warnAbove: issue.warnAbove });
    case 'salt-length-out-of-range':
      return t('tools.argon2-hash.texts.error-salt-length', { min: issue.min, max: issue.max });
    case 'invalid-hex-salt':
      return t('tools.argon2-hash.texts.error-invalid-hex-salt', { min: issue.min, max: issue.max });
  }
}

// Result
const result = ref('');
const error = ref('');
const isHashing = ref(false);

// hash-wasm computes synchronously once its WASM module is loaded, so give the
// browser a frame to paint the loading state before the main thread is busy.
function waitForPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
}

async function generateHash() {
  if (validation.value.errors.length > 0) {
    return;
  }
  error.value = '';
  isHashing.value = true;
  try {
    await nextTick();
    await waitForPaint();
    const saltBytes = salt.value.trim()
      ? parseHexSalt(salt.value)!
      : crypto.getRandomValues(new Uint8Array(saltLength.value));
    const options = {
      password: password.value,
      salt: saltBytes,
      iterations: iterations.value,
      memorySize: memorySizeKB.value,
      parallelism: parallelism.value,
      hashLength: hashLength.value,
      outputType: outputType.value,
    } as const;

    const fn = algorithm.value === 'argon2id' ? argon2id : algorithm.value === 'argon2i' ? argon2i : argon2d;

    result.value = await fn(options);
  } catch (err: any) {
    error.value = err.toString();
  } finally {
    isHashing.value = false;
  }
}

// Verify
const verifyPassword = ref('');
const verifyHash = ref('');
const verifyResult = ref<'match' | 'no-match' | 'invalid' | null>(null);
let verifyRun = 0;
watchDebounced(
  [verifyPassword, verifyHash],
  async ([pw, hash]) => {
    const run = ++verifyRun;
    if (!pw || !hash.trim()) {
      verifyResult.value = null;
      return;
    }
    const outcome = await verifyArgon2(pw, hash);
    // Ignore a result that was overtaken by newer input.
    if (run === verifyRun) {
      verifyResult.value = outcome;
    }
  },
  { debounce: 300 },
);
const verifyResultText = computed(() => {
  switch (verifyResult.value) {
    case 'match':
      return t('tools.argon2-hash.texts.verify-match');
    case 'no-match':
      return t('tools.argon2-hash.texts.verify-no-match');
    case 'invalid':
      return t('tools.argon2-hash.texts.verify-invalid');
    default:
      return undefined;
  }
});
</script>

<template>
  <c-card :title="t('tools.argon2-hash.texts.title-hash')">
    <NForm label-width="120" label-placement="left">
      <NFormItem :label="t('tools.argon2-hash.texts.label-preset')">
        <NSelect v-model:value="preset" :options="presetOptions" data-test-id="argon2-preset" />
      </NFormItem>

      <NFormItem :label="t('tools.argon2-hash.texts.label-algorithm')">
        <NSelect
          v-model:value="algorithm"
          :options="[
            { label: t('tools.argon2-hash.texts.label-argon2id'), value: 'argon2id' },
            { label: t('tools.argon2-hash.texts.label-argon2i'), value: 'argon2i' },
            { label: t('tools.argon2-hash.texts.label-argon2d'), value: 'argon2d' },
          ]"
        />
      </NFormItem>

      <NFormItem :label="t('tools.argon2-hash.texts.label-password')">
        <NInput
          v-model:value="password"
          type="password"
          show-password-on="click"
          :input-props="{ autocomplete: 'off' }"
          :placeholder="t('tools.argon2-hash.texts.placeholder-enter-password')"
        />
      </NFormItem>

      <NFormItem :label="t('tools.argon2-hash.texts.label-salt-hex')">
        <NInput v-model:value="salt" :placeholder="t('tools.argon2-hash.texts.placeholder-optional-hex-salt')" />
      </NFormItem>

      <n-space justify="space-evenly">
        <NFormItem :label="t('tools.argon2-hash.texts.label-iterations')">
          <NInputNumber v-model:value="iterations" :min="1" style="width: 100px" />
        </NFormItem>

        <NFormItem :label="t('tools.argon2-hash.texts.label-memory-kib')">
          <NInputNumber v-model:value="memorySizeKB" :min="8" style="width: 120px" />
        </NFormItem>

        <NFormItem :label="t('tools.argon2-hash.texts.label-parallelism')">
          <NInputNumber v-model:value="parallelism" :min="1" style="width: 100px" />
        </NFormItem>

        <NFormItem :label="t('tools.argon2-hash.texts.label-hash-length')">
          <NInputNumber v-model:value="hashLength" :min="16" style="width: 100px" />
        </NFormItem>

        <NFormItem :label="t('tools.argon2-hash.texts.label-salt-length')">
          <NInputNumber v-model:value="saltLength" :disabled="salt.trim() !== ''" style="width: 100px" />
        </NFormItem>
      </n-space>

      <NFormItem :label="t('tools.argon2-hash.texts.label-output-type')">
        <NSelect
          v-model:value="outputType"
          :options="[
            { label: t('tools.argon2-hash.texts.label-hex'), value: 'hex' },
            { label: t('tools.argon2-hash.texts.label-encoded'), value: 'encoded' },
            { label: t('tools.argon2-hash.texts.label-binary'), value: 'binary' },
          ]"
        />
      </NFormItem>

      <c-alert v-for="issue in validation.errors" :key="issue.kind" type="error" mb-2>
        {{ issueMessage(issue) }}
      </c-alert>
      <c-alert v-for="issue in validation.warnings" :key="issue.kind" type="warning" mb-2>
        {{ issueMessage(issue) }}
      </c-alert>

      <n-space justify="center">
        <NButton
          type="primary"
          :loading="isHashing"
          :disabled="isHashing || validation.errors.length > 0"
          data-test-id="argon2-generate"
          @click="generateHash"
        >
          {{ isHashing ? t('tools.argon2-hash.texts.tag-hashing') : t('tools.argon2-hash.texts.tag-generate') }}
        </NButton>
      </n-space>
    </NForm>

    <c-alert v-if="error" type="error" mt-2>
      {{ error }}
    </c-alert>
    <c-card v-if="result" :title="t('tools.argon2-hash.texts.title-argon2-hash')" mt-2>
      <textarea-copyable :value="result" data-test-id="argon2-result" />
    </c-card>
  </c-card>

  <c-card :title="t('tools.argon2-hash.texts.title-verify')">
    <NForm label-width="120" label-placement="left">
      <NFormItem :label="t('tools.argon2-hash.texts.label-password')">
        <NInput
          v-model:value="verifyPassword"
          type="password"
          show-password-on="click"
          :input-props="{ autocomplete: 'off' }"
          :placeholder="t('tools.argon2-hash.texts.placeholder-password-to-verify')"
          data-test-id="argon2-verify-password"
        />
      </NFormItem>
      <NFormItem :label="t('tools.argon2-hash.texts.label-hash')">
        <NInput
          v-model:value="verifyHash"
          :placeholder="t('tools.argon2-hash.texts.placeholder-hash-to-verify')"
          data-test-id="argon2-verify-hash"
        />
      </NFormItem>
      <c-input-text
        :value="verifyResultText"
        :placeholder="t('tools.argon2-hash.texts.verify-result')"
        readonly
        text-center
        class="verify-result"
        :class="verifyResult == null ? undefined : verifyResult === 'match' ? 'positive' : 'negative'"
        data-test-id="argon2-verify-result"
      />
    </NForm>
  </c-card>
</template>

<style lang="less" scoped>
.verify-result {
  &.positive :deep(input) {
    color: v-bind('themeVars.successColor');
  }

  &.negative :deep(input) {
    color: v-bind('themeVars.errorColor');
  }
}
</style>
