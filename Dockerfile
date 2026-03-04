# ---------- 1) BUILDER (composer + wymagane ext) ----------
FROM php:8.3-cli-alpine AS vendor

WORKDIR /app

# deps do intl/gd + composer
RUN apk add --no-cache \
      git unzip icu-libs libpng libjpeg-turbo freetype \
  && apk add --no-cache --virtual .build-deps \
      $PHPIZE_DEPS icu-dev libpng-dev libjpeg-turbo-dev freetype-dev \
  && docker-php-ext-configure gd --with-jpeg --with-freetype \
  && docker-php-ext-install -j$(nproc) intl gd \
  && apk del .build-deps

# composer binary
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN php -m | grep -E "^(intl|gd)  || (php -m && exit 1)
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader --ignore-platform-req=ext-intl --ignore-platform-req=ext-gd


# ---------- 2) RUNTIME ----------
FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    nginx supervisor curl \
    icu-libs libpng libjpeg-turbo freetype libzip libpq \
  && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    icu-dev libpng-dev libjpeg-turbo-dev freetype-dev libzip-dev oniguruma-dev postgresql-dev \
  && docker-php-ext-configure gd --with-jpeg --with-freetype \
    pdo pdo_mysql pdo_pgsql mbstring zip intl gd opcache \
  && apk del .build-deps

RUN { \
  echo 'opcache.enable=1'; \
  echo 'opcache.enable_cli=0'; \
  echo 'opcache.memory_consumption=128'; \
  echo 'opcache.interned_strings_buffer=16'; \
  echo 'opcache.max_accelerated_files=20000'; \
  echo 'opcache.validate_timestamps=0'; \
} > /usr/local/etc/php/conf.d/opcache-recommended.ini

WORKDIR /var/www/html

COPY --from=vendor /app/vendor ./vendor
COPY . .

RUN mkdir -p storage bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8080
CMD ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]
