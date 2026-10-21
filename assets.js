export const imageAssets = {
  office: ['assets/images/spy_office_background_q90.webp', 'assets/images/spy_office_background.png'],
  safeClosed: ['assets/images/safe_closed.webp?v=c59c6dee86e7', 'assets/images/safe_closed.png?v=06eda9aefeee'],
  safeOpen: ['assets/images/safe_open.webp?v=b0629f8767c6', 'assets/images/safe_open.png?v=3dafb37eaae8'],
  front: ['assets/images/invitation_front.webp', 'assets/images/invitation_front.png'],
  back: ['assets/images/invitation_back.webp', 'assets/images/invitation_back.png']
};

export function sceneImages(scene, { returning = false, question = 0 } = {}) {
  if (scene === 'intro') return returning ? ['front', 'back'] : [];
  if (scene === 'detector') return question === 0 ? ['safeClosed'] : ['safeClosed', 'safeOpen', 'front'];
  if (scene === 'report' || scene === 'safe') return ['safeClosed', 'safeOpen', 'front', 'back'];
  return ['front', 'back'];
}

export class ImageLoader {
  constructor({ createImage = () => new Image(), concurrency = 2, timeout = 20000 } = {}) {
    this.createImage = createImage;
    this.concurrency = concurrency;
    this.timeout = timeout;
    this.entries = new Map();
    this.queue = [];
    this.active = 0;
  }

  ready(id) { return this.entries.get(id)?.status === 'ready'; }
  url(id) { return this.entries.get(id)?.url || imageAssets[id][0]; }

  ensure(id, urgent = false) {
    if (!Object.hasOwn(imageAssets, id)) return Promise.reject(new Error(`Unknown image: ${id}`));
    let entry = this.entries.get(id);
    if (entry) {
      if (urgent && entry.status === 'queued') {
        entry.urgent = true;
        this.queue.sort((a, b) => Number(b.urgent) - Number(a.urgent));
      }
      return entry.promise;
    }
    entry = { id, urgent, status: 'queued' };
    entry.promise = new Promise((resolve, reject) => { entry.resolve = resolve; entry.reject = reject; });
    this.entries.set(id, entry);
    this.queue.push(entry);
    this.queue.sort((a, b) => Number(b.urgent) - Number(a.urgent));
    this.pump();
    return entry.promise;
  }

  prepare(ids, urgent = false) { return Promise.all(ids.map(id => this.ensure(id, urgent))); }

  warm(ids) {
    for (const id of ids) this.ensure(id).catch(() => {
      // A failed speculative request is retried at the next explicit transition.
      console.warn(`Image preparation failed: ${id}`);
    });
  }

  pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const entry = this.queue.shift();
      entry.status = 'loading';
      this.active++;
      this.load(entry).then(image => {
        entry.image = image; // Retain the decoded image for the next scene.
        entry.status = 'ready';
        entry.resolve(entry.url);
      }, error => {
        this.entries.delete(entry.id); // Do not cache failures: allow recovery.
        entry.reject(error);
      }).finally(() => { this.active--; this.pump(); });
    }
  }

  async load(entry) {
    for (const url of imageAssets[entry.id]) {
      try {
        const image = await this.decode(url, entry.urgent);
        entry.url = url;
        return image;
      } catch (error) {
        if (url === imageAssets[entry.id].at(-1)) throw error;
      }
    }
  }

  decode(url, urgent) {
    return new Promise((resolve, reject) => {
      const image = this.createImage();
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        image.onload = image.onerror = null;
        if (error) {
          image.removeAttribute?.('src');
          reject(error);
        } else resolve(image);
      };
      const timer = setTimeout(() => finish(new Error(`Image timed out: ${url}`)), this.timeout);
      image.decoding = 'async';
      image.fetchPriority = urgent ? 'high' : 'low';
      image.onload = async () => {
        try {
          if (image.decode) await image.decode();
          if (!image.naturalWidth || !image.naturalHeight) throw new Error(`Empty image: ${url}`);
          finish();
        } catch (error) { finish(error); }
      };
      image.onerror = () => finish(new Error(`Image unavailable: ${url}`));
      image.src = url;
    });
  }
}
