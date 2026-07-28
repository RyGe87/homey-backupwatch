'use strict';

const Homey = require('homey');

const LAST_OK_KEY = 'lastResultAt';   // tijdstip van het laatste bericht, in ms
const OVERDUE_KEY = 'overdueSignalled';

class JobDevice extends Homey.Device {

  async onInit() {
    // Bij een herstart weten we nog niets; 'unknown' is eerlijker dan 'ok'.
    if (this.getCapabilityValue('backup_state') === null) {
      await this.setCapabilityValue('backup_state', 'unknown').catch(this.error);
      await this.setCapabilityValue('backup_detail', this.homey.__('never_reported')).catch(this.error);
    }
    this.log(`taak ${this.getData().id} gereed`);
  }

  get jobId() {
    return this.getData().id;
  }

  isHealthy() {
    return this.getCapabilityValue('backup_state') === 'ok';
  }

  /** Verwerkt een binnengekomen resultaat en zet de juiste flow in gang. */
  async applyReport({ ok, detail, files }) {
    const nu = new Date();
    await this.setStoreValue(LAST_OK_KEY, nu.getTime());
    await this.setStoreValue(OVERDUE_KEY, false);

    await this.setCapabilityValue('backup_state', ok ? 'ok' : 'failed').catch(this.error);
    await this.setCapabilityValue('backup_last_run', this.formatTijd(nu)).catch(this.error);
    await this.setCapabilityValue('backup_detail', detail || '').catch(this.error);
    if (files !== null) {
      await this.setCapabilityValue('measure_backup_files', files).catch(this.error);
    }

    const app = this.homey.app;
    if (ok) {
      await app.triggerSucceeded.trigger(this, {
        job: this.jobId,
        files: files === null ? 0 : files,
        detail: detail || '',
      }).catch(this.error);
    } else {
      await app.triggerFailed.trigger(this, {
        job: this.jobId,
        reason: detail || this.homey.__('no_reason'),
      }).catch(this.error);
    }
  }

  /**
   * Waakhond: is er te lang niets binnengekomen? Dit vangt het geval dat het
   * script helemaal niet meer draait — dan meldt immers ook niemand een fout.
   */
  async checkOverdue() {
    const laatste = this.getStoreValue(LAST_OK_KEY);
    if (!laatste) return;                       // nog nooit iets gehad

    const maxUren = Number(this.getSetting('max_age_hours')) || 26;
    const uren = (Date.now() - laatste) / 36e5;
    if (uren < maxUren) return;

    if (this.getStoreValue(OVERDUE_KEY)) return; // al gemeld, niet blijven herhalen
    await this.setStoreValue(OVERDUE_KEY, true);

    await this.setCapabilityValue('backup_state', 'overdue').catch(this.error);
    await this.setCapabilityValue('backup_detail',
      this.homey.__('overdue_detail', { hours: Math.floor(uren) })).catch(this.error);

    await this.homey.app.triggerOverdue.trigger(this, {
      job: this.jobId,
      hours: Math.floor(uren),
    }).catch(this.error);
  }

  /**
   * De runtime van Homey draait op UTC; zonder expliciete tijdzone zou hier
   * een tijd staan die uren afwijkt van wat de gebruiker op de klok ziet.
   */
  formatTijd(d) {
    try {
      const tz = this.homey.clock.getTimezone();
      const delen = new Intl.DateTimeFormat('nl-BE', {
        timeZone: tz,
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d).reduce((acc, p) => {
        acc[p.type] = p.value;
        return acc;
      }, {});
      return `${delen.day}/${delen.month} ${delen.hour}:${delen.minute}`;
    } catch (err) {
      this.error('tijdzone onbekend, val terug op UTC:', err);
      const p = (n) => String(n).padStart(2, '0');
      return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
    }
  }

}

module.exports = JobDevice;
