// apps/mobile/src/native/CTranslate2/NativeCTranslate2.ts
// Bridges to the native CTranslate2Bridge Objective-C++ module.
// Falls back to a mock if the native module isn't linked (e.g., simulator without rebuild).

import { NativeModules } from 'react-native';

export interface CTranslate2Spec {
  loadModel(modelPath: string, direction: string): Promise<boolean>;
  unloadModel(direction: string): Promise<void>;
  translate(text: string, direction: string): Promise<string>;
  isModelLoaded(direction: string): Promise<boolean>;
}

const NativeBridge = NativeModules.CTranslate2Bridge as {
  loadModel(modelPath: string, direction: string): Promise<boolean>;
  unloadModel(direction: string): Promise<boolean>;
  translate(text: string, direction: string): Promise<string>;
  isModelLoaded(direction: string): Promise<boolean>;
} | undefined;

class CTranslate2Native implements CTranslate2Spec {
  async loadModel(modelPath: string, direction: string): Promise<boolean> {
    return NativeBridge!.loadModel(modelPath, direction);
  }

  async unloadModel(direction: string): Promise<void> {
    await NativeBridge!.unloadModel(direction);
  }

  async translate(text: string, direction: string): Promise<string> {
    return NativeBridge!.translate(text, direction);
  }

  async isModelLoaded(direction: string): Promise<boolean> {
    return NativeBridge!.isModelLoaded(direction);
  }
}

class CTranslate2Mock implements CTranslate2Spec {
  private loadedModels = new Set<string>();

  async loadModel(_modelPath: string, direction: string): Promise<boolean> {
    console.log(`[CTranslate2Mock] loadModel called for ${direction} (no-op)`);
    this.loadedModels.add(direction);
    return true;
  }

  async unloadModel(direction: string): Promise<void> {
    console.log(`[CTranslate2Mock] unloadModel called for ${direction}`);
    this.loadedModels.delete(direction);
  }

  async translate(text: string, direction: string): Promise<string> {
    console.log(
      `[CTranslate2Mock] translate called (${direction}): "${text.slice(0, 50)}..."`,
    );
    return `[mock-${direction}] ${text}`;
  }

  async isModelLoaded(direction: string): Promise<boolean> {
    return this.loadedModels.has(direction);
  }
}

export const CTranslate2: CTranslate2Spec = NativeBridge
  ? new CTranslate2Native()
  : new CTranslate2Mock();

export const isNativeAvailable = !!NativeBridge;
