import { useEffect, useRef } from 'react';

/**
 * Base interface for ViewModels
 * All ViewModels should extend this interface
 */
export interface ViewModel {
  /**
   * Cleanup function called when the view unmounts
   */
  cleanup?: () => void;
}

/**
 * Hook for managing ViewModel lifecycle in React components
 * Follows the MVVM (Model-View-ViewModel) architecture pattern
 *
 * @param createViewModel - Factory function that creates and returns a ViewModel instance
 * @returns The ViewModel instance
 *
 * @example
 * ```tsx
 * // Define your ViewModel
 * class ProfileViewModel implements ViewModel {
 *   user: User;
 *
 *   constructor(userId: string) {
 *     this.user = fetchUser(userId);
 *   }
 *
 *   updateProfile(data: Partial<User>) {
 *     // Update logic
 *   }
 *
 *   cleanup() {
 *     // Cleanup subscriptions, listeners, etc.
 *   }
 * }
 *
 * // Use in component
 * function ProfileView({ userId }: Props) {
 *   const viewModel = useViewModel(() => new ProfileViewModel(userId));
 *
 *   return (
 *     <View>
 *       <Text>{viewModel.user.name}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useViewModel<T extends ViewModel>(
  createViewModel: () => T
): T {
  const viewModelRef = useRef<T | null>(null);

  // Create the ViewModel instance only once
  if (viewModelRef.current === null) {
    viewModelRef.current = createViewModel();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewModelRef.current?.cleanup) {
        viewModelRef.current.cleanup();
      }
    };
  }, []);

  return viewModelRef.current;
}

/**
 * Alternative hook that recreates the ViewModel when dependencies change
 * Use this when your ViewModel depends on props or state that can change
 *
 * @param createViewModel - Factory function that creates and returns a ViewModel instance
 * @param deps - Dependency array (similar to useEffect)
 * @returns The ViewModel instance
 *
 * @example
 * ```tsx
 * function ProfileView({ userId }: Props) {
 *   const viewModel = useViewModelWithDeps(
 *     () => new ProfileViewModel(userId),
 *     [userId]
 *   );
 *
 *   return <View>...</View>;
 * }
 * ```
 */
export function useViewModelWithDeps<T extends ViewModel>(
  createViewModel: () => T,
  deps: React.DependencyList
): T {
  const viewModelRef = useRef<T | null>(null);
  const depsRef = useRef<React.DependencyList>(deps);

  // Check if dependencies have changed
  const depsChanged =
    !viewModelRef.current ||
    deps.length !== depsRef.current.length ||
    deps.some((dep, i) => dep !== depsRef.current[i]);

  // Recreate ViewModel if dependencies changed
  if (depsChanged) {
    // Cleanup old ViewModel
    if (viewModelRef.current?.cleanup) {
      viewModelRef.current.cleanup();
    }

    // Create new ViewModel
    viewModelRef.current = createViewModel();
    depsRef.current = deps;
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewModelRef.current?.cleanup) {
        viewModelRef.current.cleanup();
      }
    };
  }, []);

  return viewModelRef.current!;
}

/**
 * Helper type for extracting ViewModel class constructor types
 */
export type ViewModelConstructor<T extends ViewModel> = new (...args: any[]) => T;

/**
 * Factory function helper for creating ViewModels with dependencies
 *
 * @example
 * ```tsx
 * const createProfileViewModel = createViewModelFactory(
 *   ProfileViewModel,
 *   (userId: string, theme: Theme) => [userId, theme]
 * );
 *
 * function ProfileView({ userId }: Props) {
 *   const { theme } = useTheme();
 *   const viewModel = useViewModel(() => createProfileViewModel(userId, theme));
 * }
 * ```
 */
export function createViewModelFactory<T extends ViewModel, Args extends any[]>(
  ViewModelClass: ViewModelConstructor<T>,
  argsMapper: (...args: Args) => ConstructorParameters<ViewModelConstructor<T>>
) {
  return (...args: Args): T => {
    const mappedArgs = argsMapper(...args);
    return new ViewModelClass(...mappedArgs);
  };
}
