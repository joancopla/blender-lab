/**
 * Provisional Lab 02 page (phase 2): the replica in free mode with Statistics on,
 * to try Edit Mode and selection. The real page (intro, stages) comes in phase 7.
 */
import { mountLab } from '../engine/app';
import { loadPrefs } from '../engine/lab-prefs';
import { t } from '../i18n';
import { lab02 } from '../labs/02-edit-mode';
import './lab.css';

const page = document.getElementById('app')!;
page.className = 'lab-preview';
const banner = document.createElement('div');
banner.className = 'lab-preview-banner';
banner.textContent = t('lab02.preview');
const replica = document.createElement('div');
replica.className = 'lab-preview-replica';
const host = document.createElement('div');
replica.append(host);
page.append(banner, replica);

const prefs = loadPrefs();
const app = mountLab(host, lab02, { inputPrefs: () => prefs, statistics: true });
app.keyOverlay.setEnabled(prefs.keyOverlay);
