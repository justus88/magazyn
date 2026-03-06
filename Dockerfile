# ---------- 1) BUILDER (composer + wymagane ext) ----------
FROM php:8.4-cli-alpine AS vendor

WORKDIR /app

# deps do intl/gd + composer
RUN apk add --no-cache \
      git unzip icu-libs libpng libjpeg-turbo freetype libzip \
  && apk add --no-cache --virtual .build-deps \
      $PHPIZE_DEPS icu-dev libpng-dev libjpeg-turbo-dev freetype-dev libzip-dev \
  && docker-php-ext-configure gd --with-jpeg --with-freetype \
  && docker-php-ext-install -j$(nproc) intl gd zip \
  && apk del .build-deps

# composer binary
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader --no-scripts --ignore-platform-req=ext-intl --ignore-platform-req=ext-gd --ignore-platform-req=ext-zip


# ---------- 2) RUNTIME ----------
FROM php:8.4-fpm-alpine

RUN apk add --no-cache \
    nginx supervisor curl \
    icu-libs libpng libjpeg-turbo freetype libzip libpq \
  && rm -f /etc/nginx/http.d/default.conf \
  && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    icu-dev libpng-dev libjpeg-turbo-dev freetype-dev libzip-dev oniguruma-dev postgresql-dev \
  && docker-php-ext-configure gd --with-jpeg --with-freetype \
  && docker-php-ext-install -j$(nproc) pdo pdo_mysql pdo_pgsql mbstring zip intl gd opcache \
  && apk del .build-deps

RUN { \
  echo 'opcache.enable=1'; \
  echo 'opcache.enable_cli=0'; \
  echo 'opcache.memory_consumption=128'; \
  echo 'opcache.interned_strings_buffer=16'; \
  echo 'opcache.max_accelerated_files=20000'; \
  echo 'opcache.validate_timestamps=0'; \
  echo 'upload_max_filesize=20M'; \
  echo 'post_max_size=20M'; \
  echo 'memory_limit=256M'; \
  echo 'max_execution_time=120'; \
} > /usr/local/etc/php/conf.d/opcache-recommended.ini

WORKDIR /var/www/html

COPY --from=vendor /app/vendor ./vendor
COPY . .

RUN mkdir -p storage/framework/views storage/framework/cache storage/framework/sessions storage/app/livewire-tmp bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8080
CMD ["/bin/sh","-lc","php artisan migrate --force || true; php artisan config:clear || true; php artisan cache:clear || true; php artisan route:clear || true; php artisan view:clear || true; exec /usr/bin/supervisord -c /etc/supervisord.conf"]
