import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { makeStyles, useTheme, type Tone } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../utils/haptics';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** critical for destructive actions (cancel a listing), brand otherwise. */
  tone?: Tone;
  icon?: IconName;
}

type Resolver = (confirmed: boolean) => void;

const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | undefined
>(undefined);

/**
 * Asks before anything that cannot be undone.
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Cancel listing?', confirmLabel: 'Cancel listing', tone: 'critical' })) {
 *     ...
 *   }
 *
 * Destructive confirmations buzz as they open, paint the confirm button red,
 * and label it with the actual verb ("Cancel listing", never "OK"), so the
 * user reads what will happen rather than reflexively accepting. The safe
 * choice sits on the left, where a hurried thumb reaches first.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const resolver = useRef<Resolver | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    if (next.tone === 'critical') haptics.warning();
    setOptions(next);
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    setVisible(false);
    resolver.current?.(result);
    resolver.current = null;
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {options ? (
        <ConfirmBody options={options} visible={visible} onSettle={settle} />
      ) : null}
    </ConfirmContext.Provider>
  );
}

function ConfirmBody({
  options,
  visible,
  onSettle,
}: {
  options: ConfirmOptions;
  visible: boolean;
  onSettle: (result: boolean) => void;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const t = useT();
  const tone = options.tone ?? 'brand';
  const c = theme.tone(tone);
  const destructive = tone === 'critical';

  return (
    <BottomSheet
      visible={visible}
      onClose={() => onSettle(false)}
      footer={
        <View style={styles.actions}>
          <Button
            label={options.cancelLabel ?? t('common.cancel')}
            variant="secondary"
            onPress={() => onSettle(false)}
            style={styles.flex}
          />
          <Button
            label={options.confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            onPress={() => onSettle(true)}
            haptic={destructive ? 'medium' : 'light'}
            style={styles.flex}
          />
        </View>
      }
    >
      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
          <Icon
            name={
              options.icon ?? (destructive ? 'warning-outline' : 'help-circle-outline')
            }
            size={30}
            color={c.fg}
          />
        </View>
        <AppText variant="headline" align="center" accessibilityRole="header">
          {options.title}
        </AppText>
        {options.message ? (
          <AppText variant="body" color="textSecondary" align="center">
            {options.message}
          </AppText>
        ) : null}
      </View>
    </BottomSheet>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context;
}

const useStyles = makeStyles((t) => ({
  body: { alignItems: 'center', gap: t.spacing.sm, paddingVertical: t.spacing.sm },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.sm,
  },
  actions: { flexDirection: 'row', gap: t.spacing.sm + 4 },
  flex: { flex: 1 },
}));
