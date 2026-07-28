'use strict';

const Homey = require('homey');

// Hoe vaak we controleren of een taak stilgevallen is.
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

// Rapporten van taken die (nog) geen device hebben, onthouden we zodat ze
// tijdens het koppelen in de lijst verschijnen.
const SEEN_KEY = 'seen_jobs';

class BackupWatchApp extends Homey.App {

  async onInit() {
    this.triggerFailed = this.homey.flow.getDeviceTriggerCard('backup_failed');
    this.triggerSucceeded = this.homey.flow.getDeviceTriggerCard('backup_succeeded');
    this.triggerOverdue = this.homey.flow.getDeviceTriggerCard('backup_overdue');

    this.homey.flow.getConditionCard('backup_is_healthy')
      .registerRunListener(async ({ device }) => device.isHealthy());

    this.checkTimer = this.homey.setInterval(() => {
      this.checkOverdue().catch((err) => this.error('controle mislukt:', err));
    }, CHECK_INTERVAL_MS);

    // Ook meteen bij het opstarten kijken, zodat een taak die tijdens een
    // herstart verlopen is niet stilletjes wegvalt.
    this.homey.setTimeout(() => {
      this.checkOverdue().catch((err) => this.error('controle mislukt:', err));
    }, 30 * 1000);

    this.log('Backup Watch gestart');
  }

  async onUninit() {
    if (this.checkTimer) this.homey.clearInterval(this.checkTimer);
  }

  /** Alle gekoppelde back-uptaken. */
  getJobDevices() {
    try {
      return this.homey.drivers.getDriver('job').getDevices();
    } catch (err) {
      this.error('kon devices niet ophalen:', err);
      return [];
    }
  }

  findDevice(jobId) {
    return this.getJobDevices().find((d) => d.getData().id === jobId) || null;
  }

  /** Taken die zich gemeld hebben maar nog niet gekoppeld zijn. */
  getSeenJobs() {
    return this.homey.settings.get(SEEN_KEY) || [];
  }

  rememberJob(jobId) {
    const seen = this.getSeenJobs();
    if (!seen.includes(jobId)) {
      seen.push(jobId);
      this.homey.settings.set(SEEN_KEY, seen);
    }
  }

  /**
   * Verwerkt een rapport van een back-upscript.
   * Verwacht: { job, status: 'ok'|'fail', message, files }
   */
  async handleReport(report = {}) {
    const jobId = String(report.job || '').trim();
    if (!jobId) {
      throw new Error('veld "job" ontbreekt');
    }

    const ok = String(report.status || '').toLowerCase() === 'ok';
    const detail = String(report.message || '').slice(0, 200);
    const files = Number.isFinite(Number(report.files)) ? Number(report.files) : null;

    this.rememberJob(jobId);

    const device = this.findDevice(jobId);
    if (!device) {
      // Geen device gekoppeld: onthouden en netjes melden, niet crashen.
      this.log(`rapport voor onbekende taak "${jobId}" — koppel hem in Homey om meldingen te krijgen`);
      return { accepted: true, paired: false, job: jobId };
    }

    await device.applyReport({ ok, detail, files });
    return { accepted: true, paired: true, job: jobId, status: ok ? 'ok' : 'failed' };
  }

  /** Kijkt of er taken zijn die te lang niets van zich lieten horen. */
  async checkOverdue() {
    for (const device of this.getJobDevices()) {
      try {
        await device.checkOverdue();
      } catch (err) {
        this.error(`controle van ${device.getName()} mislukt:`, err);
      }
    }
  }

}

module.exports = BackupWatchApp;
