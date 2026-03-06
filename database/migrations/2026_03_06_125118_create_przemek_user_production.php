<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        User::updateOrCreate(
            ['email' => 'pejot@wp.pl'],
            [
                'name' => 'Przemek',
                'password' => Hash::make('10Pejotserwis'),
            ]
        );
    }

    public function down(): void
    {
        //
    }
};
